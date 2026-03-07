import { browser } from "k6/browser";
import { check } from 'https://jslib.k6.io/k6-utils/1.5.0/index.js';

const BASE_URL = __ENV.BASE_URL || "http://localhost:3333";

export const options = {
  scenarios: {
    ui: {
      executor: "shared-iterations",
      options: {
        browser: {
          type: "chromium",
        },
      },
    },
  },
};

export default async function () {
  const foodContext = await browser.newContext();
  await foodContext.addCookies([
    {
      name: "FooBar",
      value: 123456,
      domain: BASE_URL,
      path: '/',
    },
  ]);
  const foodPage = await foodContext.newPage();
  const cookies = await foodContext.cookies();

  await foodPage.goto(BASE_URL);

  check(cookies, {
    "cookie length of QuickFood page": cookies => cookies.length === 1,
    "cookie name": cookies => cookies[0].name === "FooBar",
    "cookie value": cookies => cookies[0].value === "123456"
  });

  await foodPage.close();
  await foodContext.close();

  const anotherContext = await browser.newContext();
  const anotherPage = await anotherContext.newPage();
  const anotherCookies = await anotherContext.cookies();

  await anotherPage.goto('https://example.org/');

  check(anotherCookies, {
    "cookie length of example test page": anotherCookies => anotherCookies.length === 0,
  });

  await anotherPage.close();
}
