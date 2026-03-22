//go:build ignore

package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	dbURL := os.Getenv("POSTGRES_URL")
	if dbURL == "" {
		dbURL = os.Getenv("NOTIFICATIONS_POSTGRES_URL")
	}
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/notifications?sslmode=disable"
	}

	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Drop and recreate public + ent_dev schemas for a clean slate
	// ent_dev is used by Atlas migration generation (search_path=ent_dev)
	fmt.Println("Dropping and recreating schemas (public, ent_dev) for notifications...")
	_, err = db.Exec(`
		DROP SCHEMA IF EXISTS public CASCADE;
		DROP SCHEMA IF EXISTS ent_dev CASCADE;
		CREATE SCHEMA public;
		CREATE SCHEMA ent_dev;
		GRANT ALL ON SCHEMA public TO postgres;
		GRANT ALL ON SCHEMA public TO public;
		GRANT ALL ON SCHEMA ent_dev TO postgres;
		GRANT ALL ON SCHEMA ent_dev TO public;
	`)
	if err != nil {
		log.Fatalf("Error clearing database: %v", err)
	}
	fmt.Println("✓ Successfully cleared database (public + ent_dev schemas recreated)")
}
