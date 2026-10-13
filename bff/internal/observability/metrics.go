package observability

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type Metrics struct {
	registry           *prometheus.Registry
	httpRequests       *prometheus.CounterVec
	httpDuration       *prometheus.HistogramVec
	oidcEvents         *prometheus.CounterVec
	sessionEvents      *prometheus.CounterVec
	downstreamCalls    *prometheus.CounterVec
	downstreamDuration *prometheus.HistogramVec
	hubDegraded        *prometheus.CounterVec
	redisErrors        *prometheus.CounterVec
	rateLimited        *prometheus.CounterVec
}

func NewMetrics() *Metrics {
	m := &Metrics{
		registry: prometheus.NewRegistry(),
		httpRequests: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: "openakita", Subsystem: "web_bff", Name: "http_requests_total",
			Help: "HTTP requests handled by the website BFF.",
		}, []string{"method", "route", "status"}),
		httpDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Namespace: "openakita", Subsystem: "web_bff", Name: "http_request_duration_seconds",
			Help: "Website BFF HTTP request duration.", Buckets: prometheus.DefBuckets,
		}, []string{"method", "route"}),
		oidcEvents: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: "openakita", Subsystem: "web_bff", Name: "oidc_events_total",
			Help: "OIDC flow events by operation and stable result.",
		}, []string{"operation", "result"}),
		sessionEvents: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: "openakita", Subsystem: "web_bff", Name: "session_events_total",
			Help: "Website session lifecycle events.",
		}, []string{"operation", "result"}),
		downstreamCalls: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: "openakita", Subsystem: "web_bff", Name: "downstream_calls_total",
			Help: "Account and Marketplace calls by operation and stable result.",
		}, []string{"system", "operation", "result"}),
		downstreamDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Namespace: "openakita", Subsystem: "web_bff", Name: "downstream_call_duration_seconds",
			Help: "Account and Marketplace call duration.", Buckets: prometheus.DefBuckets,
		}, []string{"system", "operation"}),
		hubDegraded: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: "openakita", Subsystem: "web_bff", Name: "hub_module_degraded_total",
			Help: "Hub module responses returned as unavailable.",
		}, []string{"module"}),
		redisErrors: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: "openakita", Subsystem: "web_bff", Name: "redis_errors_total",
			Help: "Redis operation failures observed by the BFF.",
		}, []string{"operation"}),
		rateLimited: prometheus.NewCounterVec(prometheus.CounterOpts{
			Namespace: "openakita", Subsystem: "web_bff", Name: "rate_limited_total",
			Help: "Requests rejected by the BFF fixed-window limiter.",
		}, []string{"route"}),
	}
	m.registry.MustRegister(
		prometheus.NewGoCollector(), prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{}),
		m.httpRequests, m.httpDuration, m.oidcEvents, m.sessionEvents,
		m.downstreamCalls, m.downstreamDuration, m.hubDegraded, m.redisErrors, m.rateLimited,
	)
	return m
}

func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{EnableOpenMetrics: true})
}

func (m *Metrics) ObserveHTTP(method, route string, status int, duration time.Duration) {
	m.httpRequests.WithLabelValues(method, route, strconv.Itoa(status)).Inc()
	m.httpDuration.WithLabelValues(method, route).Observe(duration.Seconds())
}

func (m *Metrics) OIDC(operation, result string) {
	m.oidcEvents.WithLabelValues(operation, result).Inc()
}
func (m *Metrics) Session(operation, result string) {
	m.sessionEvents.WithLabelValues(operation, result).Inc()
}
func (m *Metrics) Downstream(system, operation, result string, duration time.Duration) {
	m.downstreamCalls.WithLabelValues(system, operation, result).Inc()
	m.downstreamDuration.WithLabelValues(system, operation).Observe(duration.Seconds())
}
func (m *Metrics) HubDegraded(module string)   { m.hubDegraded.WithLabelValues(module).Inc() }
func (m *Metrics) RedisError(operation string) { m.redisErrors.WithLabelValues(operation).Inc() }
func (m *Metrics) RateLimited(route string)    { m.rateLimited.WithLabelValues(route).Inc() }
