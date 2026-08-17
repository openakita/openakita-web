package cryptobox

import (
	"encoding/base64"
	"testing"
)

func TestEncryptDecryptAndAADBinding(t *testing.T) {
	key := base64.RawURLEncoding.EncodeToString(make([]byte, 32))
	ring, err := Parse("current:" + key)
	if err != nil {
		t.Fatal(err)
	}
	encrypted, err := ring.Encrypt([]byte("secret-token"), []byte("session:one"))
	if err != nil {
		t.Fatal(err)
	}
	plain, err := ring.Decrypt(encrypted, []byte("session:one"))
	if err != nil || string(plain) != "secret-token" {
		t.Fatalf("decrypt = %q, %v", plain, err)
	}
	if _, err := ring.Decrypt(encrypted, []byte("session:two")); err == nil {
		t.Fatal("ciphertext must not decrypt under a different session AAD")
	}
}

func TestParseRejectsShortKeys(t *testing.T) {
	if _, err := Parse("current:c2hvcnQ"); err == nil {
		t.Fatal("expected short key to be rejected")
	}
}
