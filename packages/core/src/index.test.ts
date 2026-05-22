import { health } from "./index.js";

describe("@jaum/core", () => {
  it("returns ok", () => {
    expect(health()).toBe("ok");
  });
});
