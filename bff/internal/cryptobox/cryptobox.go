package cryptobox

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

type KeyRing struct {
	active string
	keys   map[string][]byte
}

type envelope struct {
	KeyID      string `json:"kid"`
	Nonce      string `json:"nonce"`
	Ciphertext string `json:"ciphertext"`
}

func Parse(raw string) (*KeyRing, error) {
	ring := &KeyRing{keys: map[string][]byte{}}
	for index, item := range strings.Split(raw, ",") {
		parts := strings.SplitN(strings.TrimSpace(item), ":", 2)
		if len(parts) != 2 || parts[0] == "" {
			return nil, errors.New("encryption keys must use kid:base64url format")
		}
		key, err := base64.RawURLEncoding.DecodeString(parts[1])
		if err != nil || len(key) != 32 {
			return nil, fmt.Errorf("encryption key %q must decode to 32 bytes", parts[0])
		}
		if _, exists := ring.keys[parts[0]]; exists {
			return nil, fmt.Errorf("duplicate encryption key ID %q", parts[0])
		}
		ring.keys[parts[0]] = key
		if index == 0 {
			ring.active = parts[0]
		}
	}
	if ring.active == "" {
		return nil, errors.New("at least one encryption key is required")
	}
	return ring, nil
}

func (k *KeyRing) Encrypt(plaintext, aad []byte) ([]byte, error) {
	block, err := aes.NewCipher(k.keys[k.active])
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	ciphertext := gcm.Seal(nil, nonce, plaintext, aad)
	return json.Marshal(envelope{
		KeyID: k.active, Nonce: base64.RawURLEncoding.EncodeToString(nonce),
		Ciphertext: base64.RawURLEncoding.EncodeToString(ciphertext),
	})
}

func (k *KeyRing) Decrypt(encoded, aad []byte) ([]byte, error) {
	var value envelope
	if err := json.Unmarshal(encoded, &value); err != nil {
		return nil, errors.New("invalid encrypted envelope")
	}
	key, ok := k.keys[value.KeyID]
	if !ok {
		return nil, errors.New("unknown encryption key ID")
	}
	nonce, err := base64.RawURLEncoding.DecodeString(value.Nonce)
	if err != nil {
		return nil, errors.New("invalid encrypted nonce")
	}
	ciphertext, err := base64.RawURLEncoding.DecodeString(value.Ciphertext)
	if err != nil {
		return nil, errors.New("invalid encrypted ciphertext")
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	plaintext, err := gcm.Open(nil, nonce, ciphertext, aad)
	if err != nil {
		return nil, errors.New("encrypted session authentication failed")
	}
	return plaintext, nil
}
