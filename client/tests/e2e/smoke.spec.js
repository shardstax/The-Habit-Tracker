import { test, expect } from '@playwright/test';

test('login and dashboard smoke', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[placeholder="Email"]', 'demo@example.com');
  await page.fill('input[placeholder="Password"]', 'demo1234');
  await page.click('button:has-text("Login")');

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator('h1:has-text("Daily focus")')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reminders' })).toBeVisible();
  await expect(page.locator('text=Coding Streak')).toBeVisible();
});

test('daily push actions are context-aware', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[placeholder="Email"]', 'demo@example.com');
  await page.fill('input[placeholder="Password"]', 'demo1234');
  await page.click('button:has-text("Login")');
  await expect(page).toHaveURL(/\/dashboard/);

  await page.fill('input[placeholder="Add a new task"]', `Playwright push task ${Date.now()}`);
  await page.click('button:has-text("Add")');

  await page.locator('.menu-button').first().click();
  const pushTomorrow = page.locator('.task-menu-item:has-text("Push Tomorrow")').first();
  await expect(pushTomorrow).toBeVisible();
  await pushTomorrow.click();

  await page.click('a:has-text("Tomorrow")');
  await expect(page).toHaveURL(/\/tomorrow/);
  await page.locator('.menu-button').first().click();
  await expect(page.locator('.task-menu-item:has-text("Push Today")').first()).toBeVisible();
  await expect(page.locator('.task-menu-item:has-text("Push Tomorrow")')).toHaveCount(0);
});

test('drag task between todo and completed columns', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[placeholder="Email"]', 'demo@example.com');
  await page.fill('input[placeholder="Password"]', 'demo1234');
  await page.click('button:has-text("Login")');
  await expect(page).toHaveURL(/\/dashboard/);

  const title = `Drag task ${Date.now()}`;
  await page.fill('input[placeholder="Add a new task"]', title);
  await page.click('button:has-text("Add")');

  const showCompleted = page.getByRole('button', { name: 'Show list' });
  if (await showCompleted.isVisible()) {
    await showCompleted.click();
  }

  const todoCard = page.locator('.card').filter({ has: page.getByText(/To Do \(/) }).first();
  const completedCard = page
    .locator('.card')
    .filter({ has: page.getByRole('heading', { name: /Completed today/ }) })
    .filter({ has: page.locator('.grid') })
    .first();
  const taskInTodo = todoCard.locator(`.task:has-text("${title}")`).first();
  const completedDropZone = completedCard.locator('.grid').first();
  const todoDropZone = todoCard.locator('.grid').first();

  await expect(taskInTodo).toBeVisible();
  await dragTo(taskInTodo, completedDropZone, page);
  await expect(completedCard.locator(`.task:has-text("${title}")`).first()).toBeVisible();

  const taskInCompleted = completedCard.locator(`.task:has-text("${title}")`).first();
  await dragTo(taskInCompleted, todoDropZone, page);
  await expect(todoCard.locator(`.task:has-text("${title}")`).first()).toBeVisible();
});

async function dragTo(source, target, page) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error('Missing drag bounds');
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });
  await page.mouse.up();
}
