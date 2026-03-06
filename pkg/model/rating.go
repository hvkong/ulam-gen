package model

import (
	"errors"

	"github.com/uptrace/bun"
)

type Rating struct {
	bun.BaseModel
	ID     int64 `json:"id" bun:",pk,autoincrement"`
	Stars  int   `json:"stars"`
	UserID int64 `json:"-"`
	User   *User `json:"-" bun:"rel:belongs-to,join:user_id=id"`
	FoodID int64 `json:"food_id"`
	Food   *Food `json:"-" bun:"rel:belongs-to,join:food_id=id"`
}

func (r *Rating) Validate() error {
	if r.Stars < 1 || r.Stars > 5 {
		return errors.New("number of stars must be between 1 and 5 (inclusive)")
	}

	return nil
}
