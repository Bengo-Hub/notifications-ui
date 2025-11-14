package email

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"strings"
)

type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
	StartTLS bool
}

type SMTPProvider struct {
	cfg SMTPConfig
}

func NewSMTPProvider(cfg SMTPConfig) *SMTPProvider {
	return &SMTPProvider{cfg: cfg}
}

func (p *SMTPProvider) Name() string { return "smtp" }

func (p *SMTPProvider) SendEmail(ctx context.Context, from string, to []string, subject string, htmlBody string, textBody string) error {
	if from == "" {
		from = p.cfg.From
	}
	if p.cfg.Host == "" || p.cfg.Port == 0 {
		return fmt.Errorf("smtp not configured")
	}
	addr := fmt.Sprintf("%s:%d", p.cfg.Host, p.cfg.Port)
	auth := smtp.PlainAuth("", p.cfg.Username, p.cfg.Password, p.cfg.Host)

	// Build RFC 5322 message
	var b strings.Builder
	b.WriteString("From: " + from + "\r\n")
	b.WriteString("To: " + strings.Join(to, ",") + "\r\n")
	b.WriteString("Subject: " + subject + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	if htmlBody != "" && textBody != "" {
		b.WriteString("Content-Type: multipart/alternative; boundary=BOUNDARY\r\n\r\n")
		b.WriteString("--BOUNDARY\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n" + textBody + "\r\n")
		b.WriteString("--BOUNDARY\r\nContent-Type: text/html; charset=utf-8\r\n\r\n" + htmlBody + "\r\n--BOUNDARY--")
	} else if htmlBody != "" {
		b.WriteString("Content-Type: text/html; charset=utf-8\r\n\r\n" + htmlBody)
	} else {
		b.WriteString("Content-Type: text/plain; charset=utf-8\r\n\r\n" + textBody)
	}

	var conn net.Conn
	var err error
	domain := p.cfg.Host

	if p.cfg.StartTLS {
		// Connect and then upgrade
		conn, err = net.Dial("tcp", addr)
		if err != nil {
			return err
		}
		c, err := smtp.NewClient(conn, domain)
		if err != nil {
			return err
		}
		defer c.Quit()
		if ok, _ := c.Extension("STARTTLS"); ok {
			if err = c.StartTLS(&tls.Config{ServerName: domain}); err != nil {
				return err
			}
		}
		if p.cfg.Username != "" {
			if err := c.Auth(auth); err != nil {
				return err
			}
		}
		if err := c.Mail(from); err != nil {
			return err
		}
		for _, rcpt := range to {
			if err := c.Rcpt(rcpt); err != nil {
				return err
			}
		}
		w, err := c.Data()
		if err != nil {
			return err
		}
		if _, err := w.Write([]byte(b.String())); err != nil {
			return err
		}
		return w.Close()
	}

	// Direct send (plain or implicit TLS handled by relay)
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}
	return smtp.SendMail(addr, auth, from, to, []byte(b.String()))
}
