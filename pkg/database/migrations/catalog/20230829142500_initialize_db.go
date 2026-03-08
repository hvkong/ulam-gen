package catalog

import (
	"context"

	"github.com/hvkong/ulam-gen/pkg/model"
	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		db.RegisterModel(&model.FoodToIngredients{})
		models := []interface{}{
			&model.Ingredient{},
			&model.Rice{},
			&model.Tool{},
			&model.User{},
		}
		for _, i := range models {
			if _, err := db.NewCreateTable().Model(i).IfNotExists().Exec(ctx); err != nil {
				return err
			}
		}
		_, err := db.NewCreateTable().
			Model(&model.Food{}).
			ForeignKey(`("rice_id") REFERENCES "rices" ("id")`).
			ForeignKey(`("tool") REFERENCES "tools" ("name")`).
			IfNotExists().
			Exec(ctx)
		if err != nil {
			return err
		}

		_, err = db.NewCreateTable().
			Model(&model.Rating{}).
			ForeignKey(`("user_id") REFERENCES "users" ("id") ON DELETE CASCADE`).
			ForeignKey(`("food_id") REFERENCES "foods" ("id") ON DELETE CASCADE`).
			IfNotExists().
			Exec(ctx)
		if err != nil {
			return err
		}
		_, err = db.NewCreateTable().
			Model(&model.FoodToIngredients{}).
			ForeignKey(`("food_id") REFERENCES "foods" ("id") ON DELETE CASCADE`).
			ForeignKey(`("ingredient_id") REFERENCES "ingredients" ("id")`).
			IfNotExists().
			Exec(ctx)
		if err != nil {
			return err
		}
		return nil
	}, func(ctx context.Context, db *bun.DB) error {
		return nil
	})
}
