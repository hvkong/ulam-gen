package model

import (
	"github.com/uptrace/bun"
)

type Rice struct {
	bun.BaseModel      `bun:"table:rices,alias:r"`
	ID                 int64  `bun:",pk"`
	Name               string `json:"name"`
	CaloriesPerServing int    `json:"caloriesPerServing"`
}
