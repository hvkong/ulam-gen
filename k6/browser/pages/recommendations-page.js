export class RecommendationsPage {
  constructor(page) {
    this.page = page
    this.headingTextContent = page.locator("h1");
    this.getFoodRecommendationsButton = page.getByRole('button', { name: "Food, Please!" });
    this.foodRecommendations = page.locator("div#recommendations");
  }

  async goto(baseURL) {
    await this.page.goto(baseURL);
  }

  async getFoodRecommendation() {
    await this.getFoodRecommendationsButton.click();
    await this.page.waitForTimeout(500);
    await this.page.screenshot({ path: "screenshot.png" });
  }

  async getHeadingTextContent() {
    return await this.headingTextContent.textContent();
  }

  async getFoodRecommendationsContent() {
    return await this.foodRecommendations.textContent();
  }
}