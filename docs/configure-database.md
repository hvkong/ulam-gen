## Configure Database

By default, QuickFood stores all its data in an in-memory SQLite database. This allows for a quick start while still closely resembling a real-world application. 

If you want to add an external database, you can set the `QUICKFOOD_DB` environment variable to a supported connection string. Currently only PostgreSQL and SQLite are supported.

Example connection strings:

```shell
# a remote PostgreSQL instance
export QUICKFOOD_DB="postgres://user:password@localhost:5432/database?sslmode=disable"

# Both options use a sqlite3 database
export QUICKFOOD_DB="quickfood.db"
export QUICKFOOD_DB=""
```

By default, the Docker Compose setups use a local PostgreSQL instance. To use SQLite, enable the following env vars:

```shell
# empty to use SQLite
export QUICKFOOD_DB=""
# empty to disable database instrumentation
export DB_O11Y_CONNECTION=""
```