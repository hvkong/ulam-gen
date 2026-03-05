package migrations

import (
	"github.com/hvkong/ulam-gen/pkg/database/migrations/catalog"
	"github.com/hvkong/ulam-gen/pkg/database/migrations/copy"
)

var Catalog = catalog.Migrations
var Copy = copy.Migrations
