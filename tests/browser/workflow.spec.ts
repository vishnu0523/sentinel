import { test, expect } from "@playwright/test";

test("assessment workflow: actual runs, evidence, persistence, source, reports", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Assessment overview", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/overview-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open validation lab" }).click();
  await page.getByRole("button", { name: "Run 8 controls" }).click();
  await expect(page.getByText("0/8 passed", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Hardened fixture", exact: true })
    .click();
  await page.getByRole("button", { name: "Run 8 controls" }).click();
  await expect(page.getByText("8/8 passed", { exact: true })).toBeVisible();
  await page.screenshot({ path: "artifacts/lab-desktop.png", fullPage: true });
  await page
    .getByRole("button", { name: "Evidence vault", exact: true })
    .click();
  await expect(page.getByText("2 captured records")).toBeVisible();
  await page.locator(".data-table .text-button").first().click();
  await expect(page.getByRole("status")).toContainText("Integrity verified");
  await page
    .getByRole("button", { name: "Findings", exact: false })
    .first()
    .click();
  await page.getByRole("tab", { name: "Analyst notes" }).click();
  await page
    .getByPlaceholder("Record your investigation...")
    .fill("Reviewed pinned source. Additional target validation required.");
  await page.reload();
  await page
    .getByRole("button", { name: "Findings", exact: false })
    .first()
    .click();
  await page.getByRole("tab", { name: "Analyst notes" }).click();
  await expect(
    page.getByPlaceholder("Record your investigation..."),
  ).toHaveValue(
    "Reviewed pinned source. Additional target validation required.",
  );
  await page.getByRole("button", { name: "Add finding", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Local review candidate");
  await page
    .getByLabel("Observation", { exact: true })
    .fill("A test observation pending validation.");
  await page.getByRole("button", { name: "Create candidate" }).click();
  await expect(
    page.getByRole("heading", { name: "Local review candidate" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Source review", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review repository", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Refresh inventory" }),
  ).toBeVisible({ timeout: 60000 });
  await expect(page.locator(".data-table tbody tr").first()).toBeVisible();
  await page.screenshot({
    path: "artifacts/source-desktop.png",
    fullPage: false,
  });
  await page
    .getByRole("button", { name: /^Create candidate for/ })
    .first()
    .click();
  await expect(
    page.getByText("Source signal linked to a new unverified candidate."),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Edit record" }).click();
  await page
    .getByRole("textbox", { name: "Business impact", exact: true })
    .fill("Impact pending controlled reproduction against the target.");
  await page.getByRole("button", { name: "Save finding", exact: true }).click();
  await expect(page.getByText("Finding saved.", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await expect(
    page.getByText(
      "Impact pending controlled reproduction against the target.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Attack surface", exact: true })
    .click();
  await page.getByRole("button", { name: "Browser SPA", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Browser SPA" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/surface-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Report studio", exact: true })
    .click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Markdown" }).click();
  expect((await downloaded).suggestedFilename()).toBe(
    "worldmonitor-assessment.md",
  );
  await page.getByLabel("Technical findings", { exact: true }).uncheck();
  await expect(page.locator(".report-paper .report-finding")).toHaveCount(0);
  await page.getByLabel("Technical findings", { exact: true }).check();
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: "artifacts/assessment-report.pdf",
    format: "A4",
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  await page.screenshot({
    path: "artifacts/report-desktop.png",
    fullPage: false,
  });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({
    path: "artifacts/overview-populated.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("mobile views fit and theme persists", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const name of [
    "Overview",
    "Attack surface",
    "Source review",
    "Validation lab",
    "Findings",
    "Evidence vault",
    "Remediation",
    "Report studio",
    "Scope & authorization",
  ]) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .locator(".sidebar")
      .getByRole("button", { name, exact: name !== "Findings" })
      .first()
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (name === "Overview" || name === "Validation lab")
      await page.screenshot({
        path: `artifacts/${name.replaceAll(" ", "-").toLowerCase()}-mobile.png`,
        fullPage: true,
      });
  }
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.screenshot({
    path: "artifacts/overview-dark-mobile.png",
    fullPage: true,
  });
});

test("API validates mode and refuses cross-origin requests", async ({
  request,
}) => {
  const badOrigin = await request.post("/api/assessment", {
    headers: { origin: "https://untrusted.invalid" },
    data: { action: "run", mode: "baseline" },
  });
  expect(badOrigin.status()).toBe(403);
  const invalid = await request.post("/api/assessment", {
    headers: { origin: process.env.TEST_BASE_URL || "http://localhost:3000" },
    data: { action: "run", mode: "remote" },
  });
  expect(invalid.status()).toBe(400);
});

test("packet restore validates content and preserves fixture integrity", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open validation lab" }).click();
  await page.getByRole("button", { name: "Run 8 controls" }).click();
  await expect(page.getByText("0/8 passed", { exact: true })).toBeVisible();
  const packet = await page.evaluate(() =>
    localStorage.getItem("sentinel-workspace-v2")!,
  );
  await page
    .getByRole("button", { name: "Scope & authorization", exact: true })
    .click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":2}'),
  });
  await expect(page.getByRole("status")).toContainText(
    "Invalid assessment packet",
  );
  const data = JSON.parse(packet);
  data.runs[0].provenance = "tampered";
  await page.locator('input[type="file"]').setInputFiles({
    name: "tampered.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(page.getByRole("status")).toContainText(
    "failed its integrity check",
  );
  const backup = page.waitForEvent("download");
  await page.locator('input[type="file"]').setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(packet),
  });
  expect((await backup).suggestedFilename()).toBe(
    "sentinel-before-restore.json",
  );
  await expect(page.getByRole("status")).toContainText("Packet restored");
});

test("finding verification is blocked until the evidence chain is complete", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Findings", exact: false })
    .first()
    .click();
  await page.getByRole("tab", { name: "Edit record" }).click();
  await page.locator('select[name="verification"]').selectOption("verified");
  await page.getByRole("button", { name: "Save finding", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Verification blocked");
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await expect(
    page.getByText("Unverified hypothesis", { exact: true }),
  ).toBeVisible();
});
