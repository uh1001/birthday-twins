import { describe, expect, it } from "vitest";
import { ageFrom, daysUntilBirthday, isBirthdayTwin, isYearTwin } from "./birthday";
import { earnedBadges, xpRank } from "./xp";

describe("birthday matching", () => {
  it("Birthday Twins share month and day regardless of year", () => {
    expect(isBirthdayTwin({ birth_month: 9, birth_day: 19 }, { birth_month: 9, birth_day: 19 })).toBe(true);
    expect(isBirthdayTwin({ birth_month: 9, birth_day: 19 }, { birth_month: 9, birth_day: 20 })).toBe(false);
  });

  it("Year Twins need the same full date including year", () => {
    const a = { birth_month: 9, birth_day: 19, birth_year: 1996 };
    expect(isYearTwin(a, { ...a })).toBe(true);
    expect(isYearTwin(a, { ...a, birth_year: 1997 })).toBe(false);
    expect(isYearTwin({ ...a, birth_year: null }, { ...a, birth_year: null })).toBe(false);
  });

  it("Feb 29 birthdays are celebrated on Feb 28 in non-leap years", () => {
    expect(daysUntilBirthday(2, 29, new Date(2027, 1, 27))).toBe(1);
    expect(daysUntilBirthday(2, 29, new Date(2028, 1, 28))).toBe(1);
  });

  it("age for a leap-day birthday ticks over on Feb 28 in non-leap years", () => {
    expect(ageFrom(2000, 2, 29, new Date(2027, 1, 27))).toBe(26);
    expect(ageFrom(2000, 2, 29, new Date(2027, 1, 28))).toBe(27);
  });

  it("birthday today is 0 days away", () => {
    expect(daysUntilBirthday(10, 10, new Date(2026, 9, 10, 23, 30))).toBe(0);
  });
});

describe("xp", () => {
  it("ranks start at New arrival and reach Explorer at 120 XP", () => {
    expect(xpRank(119).name).toBe("New arrival");
    expect(xpRank(120).name).toBe("Explorer");
  });
  it("Storyteller badge needs 5 shares", () => {
    const four = Array.from({ length: 4 }, () => ({ action: "share" }));
    expect(earnedBadges(four).some((b) => b.id === "storyteller")).toBe(false);
    expect(earnedBadges([...four, { action: "share" }]).some((b) => b.id === "storyteller")).toBe(true);
  });
});
