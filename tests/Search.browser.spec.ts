import postgres from "postgres";
import { test, expect, Page } from "@playwright/test";
import { getPath } from "../src/url";
import User, {UserProps} from "../src/models/User";
import { createUTCDate } from "../src/utils";

const sql = postgres({
	database: "UserStats",
});

const logout = async (page: Page) => {
	await page.goto("/logout");
};

/**
 * Clean up the database after each test. This function deletes all the rows
 * from the todos and subtodos tables and resets the sequence for each table.
 * @see https://www.postgresql.org/docs/13/sql-altersequence.html
 */
test.afterEach(async ({ page }) => {
	try {

		await sql.unsafe(
			`TRUNCATE TABLE users, favourites, game_profile, stats, session_stats RESTART IDENTITY CASCADE;`,
		);

	} catch (error) {
		console.error(error);
	}

	await logout(page);
});

test("Profile was found.", async ({ page }) => {
	await page.goto("/search");

	const dropdown = page.locator('#main-selector');
	dropdown.selectOption({value: 'PC'})
    await page.fill('form#search-form input[name="username"]', 'Davydav1919')
	await page.press('form#search-form input[name="username"]', 'Enter');

    expect(await page?.url()).toBe(getPath("stats/Davydav1919"));

})
test("Profile was not found due to invalid username.", async ({ page }) => {
	await page.goto("/search");

	const dropdown = page.locator('#main-selector');
	dropdown.selectOption({value: 'PC'})
    await page.fill('form#search-form input[name="username"]', 'Davydav1919191919')
	await page.press('form#search-form input[name="username"]', 'Enter');


    expect(await page?.url()).toBe(getPath("search?not_found_api=player_not_found"));

    const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Player not found in the API.");
})
test("Profile was not found due to empty username.", async ({ page }) => {
	await page.goto("/search");

    
	const dropdown = page.locator('#main-selector');
	dropdown.selectOption({value: 'PC'})
    await page.fill('form#search-form input[name="username"]', '')
	await page.press('form#search-form input[name="username"]', 'Enter');

    expect(await page?.url()).toBe(getPath("search?not_found_api=player_not_found"));

    const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Player not found in the API.");
})
test("Profile was not found due to invalid platform.", async ({ page }) => {
	await page.goto("/search");

	const dropdown = page.locator('#main-selector');
	dropdown.selectOption({value: 'XBOX'})
    await page.fill('form#search-form input[name="username"]', 'adamcarolla16')
	await page.press('form#search-form input[name="username"]', 'Enter');

    expect(await page?.url()).toBe(getPath("search?not_found_api=player_not_found"));

    const errorElement = await page.$("#error");

	expect(await errorElement?.innerText()).toMatch("Player not found in the API.");
})
