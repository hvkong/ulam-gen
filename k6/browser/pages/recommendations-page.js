export class RecommendationsPage {
  constructor(page) {
    this.page = page
    this.headingTextContent = page.locator("h1");
    this.getFoodRecommendationsButton = page.getByRole('button', { name: "Food, Please!" });
    this.pizzaRecommendations = page.locator("div#recommendations");
  }

  async goto(baseURL) {
    await this.page.goto(baseURL);
  }

  async getPizzaRecommendation() {
    await this.getFoodRecommendationsButton.click();
    await this.page.waitForTimeout(500);
    await this.page.screenshot({ path: "screenshot.png" });
  }

  async getHeadingTextContent() {
    return await this.headingTextContent.textContent();
  }

  async getPizzaRecommendationsContent() {
    return await this.pizzaRecommendations.textContent();
  }
}