package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"openakita-web-bff/internal/config"
	"openakita-web-bff/internal/cryptobox"
	marketplaceclient "openakita-web-bff/internal/marketplace"
	"openakita-web-bff/internal/oidc"
	"openakita-web-bff/internal/securestore"
	webapi "openakita-web-bff/internal/web"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg, err := config.Load()
	if err != nil {
		logger.Error("configuration rejected", "error", err)
		os.Exit(1)
	}
	box, err := cryptobox.Parse(cfg.SessionEncryptionKeys)
	if err != nil {
		logger.Error("session encryption keys rejected", "error", err)
		os.Exit(1)
	}
	accountPage, err := os.ReadFile(cfg.AccountPagePath)
	if err != nil {
		logger.Error("account page unavailable", "error", err)
		os.Exit(1)
	}
	store, err := securestore.NewRedis(cfg.RedisURL)
	if err != nil {
		logger.Error("Redis configuration rejected", "error", err)
		os.Exit(1)
	}
	defer store.Close()
	discoveryCtx, cancelDiscovery := context.WithTimeout(context.Background(), 5*time.Second)
	idp, err := oidc.Discover(discoveryCtx, cfg.AccountIssuer.String(), cfg.AccountClientID, cfg.AccountClientSecret, cfg.AccountRedirectURI, nil)
	cancelDiscovery()
	if err != nil {
		logger.Error("OIDC discovery failed", "error", err)
		os.Exit(1)
	}
	marketplace, err := marketplaceclient.New(cfg.MarketplaceBaseURL, cfg.MarketplaceMachineID, cfg.MarketplaceMachineSecret, nil)
	if err != nil {
		logger.Error("Marketplace client initialization failed", "error", err)
		os.Exit(1)
	}
	app, err := webapi.New(cfg, store, box, idp, marketplace, accountPage, logger)
	if err != nil {
		logger.Error("BFF initialization failed", "error", err)
		os.Exit(1)
	}

	httpServer := &http.Server{
		Addr: cfg.HTTPAddr, Handler: app.Handler(), ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second, IdleTimeout: 60 * time.Second,
		MaxHeaderBytes: 32 << 10,
	}
	shutdownCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-shutdownCtx.Done()
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = httpServer.Shutdown(ctx)
	}()
	logger.Info("OpenAkita web BFF listening", "address", cfg.HTTPAddr, "environment", cfg.Environment)
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("HTTP server stopped unexpectedly", "error", err)
		os.Exit(1)
	}
}
