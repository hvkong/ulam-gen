import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3333';

export const options = {
  scenarios: {
    smoke: {
      exec: "getFood",
      executor: "constant-vus",
      vus: 1,
      duration: "10s",
    },
    stress: {
      exec: "getFood",
      executor: "ramping-vus",
      stages: [
        { duration: '5s', target: 5 },
        { duration: '10s', target: 5 },
        { duration: '5s', target: 0 },
      ],
      startTime: "10s",
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    quickfood_ingredients: [{ threshold: 'avg<8', abortOnFail: false }],
    checks: ["rate > 0.95"]
  },
};

const pizzas = new Counter('quickfood_number_of_foods');
const ingredients = new Trend('quickfood_ingredients');

export function setup() {
  let res = http.get(BASE_URL)
  if (res.status !== 200) {
    throw new Error(`Got unexpected status code ${res.status} when trying to setup. Exiting.`)
  }
}

export function getFood() {
  let restrictions = {
    maxCaloriesPerServing: 500,
    mustBeVegetarian: false,
    excludedIngredients: ["pepperoni"],
    excludedTools: ["knife"],
    maxNumberOfToppings: 6,
    minNumberOfToppings: 2
  }
  let res = http.post(`${BASE_URL}/api/food`, JSON.stringify(restrictions), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'token abcdef0123456789',
    },
  });
  check(res, { "status is 200": (res) => res.status === 200 });
  console.log(`${res.json().food.name} (${res.json().food.ingredients.length} ingredients)`);
  pizzas.add(1);
  ingredients.add(res.json().food.ingredients.length);
  sleep(1);
}

export function teardown() {
  // TODO: Send notification to Slack
  console.log("That's all folks!")
}

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  }
}
