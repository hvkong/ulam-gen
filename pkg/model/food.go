package model

import (
	"time"
)

type Food struct {
	ID          int64        `json:"id" bun:",pk,autoincrement"`
	CreatedAt   time.Time    `json:"-" bun:",nullzero,notnull,default:current_timestamp"`
	Name        string       `json:"name"`
	DoughID     int64        `json:"-"`
	Dough       Dough        `json:"dough" bun:"rel:belongs-to,join:dough_id=id"`
	Ingredients []Ingredient `json:"ingredients" bun:"m2m:food_to_ingredients,join:Food=Ingredient"`
	Tool        string       `json:"tool"`
}

const MaxFoodNameLength = 64

func (f Food) IsVegetarian() bool {
	for _, ingredient := range f.Ingredients {
		if !ingredient.Vegetarian {
			return false
		}
	}
	return true
}

func (f Food) CalculateCalories() int {
	calories := 0
	for _, ingredient := range f.Ingredients {
		calories += ingredient.CaloriesPerSlice
	}
	return calories
}

type FoodToIngredients struct {
	FoodID       int64       `bun:",pk"`
	Food         *Food       `bun:"rel:belongs-to,join:food_id=id"`
	IngredientID int64       `bun:",pk"`
	Ingredient   *Ingredient `bun:"rel:belongs-to,join:ingredient_id=id"`
}
