import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3333";

export const options = {
  vus: 5,
  duration: "5s",
};

export default function () {
  let res;
  res = http.post(`${BASE_URL}/api/csrf-token`, null, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  check(res, { "csrf-token status is 200": (res) => res.status === 200 });

  const loginData = {
    username: "default",
    password: "12345678",
    csrf: res.cookies.csrf_token[0].value,
  };
  res = http.post(
    `${BASE_URL}/api/users/token/login`,
    JSON.stringify(loginData),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  check(res, { "login status is 200": (res) => res.status === 200 });
  sleep(0.5);

  let token = res.json().token;
  let foodData = {
    maxCaloriesPerServing: 500,
    mustBeVegetarian: false,
    excludedIngredients: ["pepperoni"],
    excludedTools: ["knife"],
    maxNumberOfToppings: 6,
    minNumberOfToppings: 2,
  };
  res = http.post(`${BASE_URL}/api/food`, JSON.stringify(foodData), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${token}`,
    },
  });
  check(res, { "food status is 200": (res) => res.status === 200 });

  let ratingsData = {
    food_id: res.json().food.id,
    stars: 5, // Love it!
  };
  res = http.post(`${BASE_URL}/api/ratings`, JSON.stringify(ratingsData), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${token}`,
    },
  });
  check(res, { "ratings status is 201": (res) => res.status === 201 });
  sleep(0.5);
}
