const { DateTime } = require('luxon');

async function fetchGitHubStats(username, token) {
  const query = `
    query($userName: String!) {
      user(login: $userName) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              firstDay
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables: { userName: username } }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error: ${res.status} ${text}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GitHub API error: ${JSON.stringify(json.errors)}`);
  }

  const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) {
    throw new Error('No contribution calendar found');
  }

  const weeks = calendar.weeks || [];
  const days = [];
  for (const week of weeks) {
    for (const day of week.contributionDays) {
      days.push({ date: day.date, count: day.contributionCount });
    }
  }

  days.sort((a, b) => (a.date < b.date ? -1 : 1));

  const { longestStreak, currentStreak } = computeStreaks(days);

  return {
    payload: {
      totalContributions: calendar.totalContributions,
      weeks,
    },
    longestStreak,
    currentStreak,
  };
}

function computeStreaks(days) {
  let longestStreak = 0;
  let currentStreak = 0;
  let run = 0;

  for (let i = 0; i < days.length; i++) {
    const count = days[i].count;
    if (count > 0) {
      run += 1;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 0;
    }
  }

  // current streak: count back from last day while consecutive and count > 0
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i];
    if (day.count === 0) {
      if (i === days.length - 1) {
        streak = 0;
      }
      break;
    }
    if (i < days.length - 1) {
      const curr = DateTime.fromISO(days[i + 1].date);
      const prev = DateTime.fromISO(day.date);
      if (curr.diff(prev, 'days').days !== 1) break;
    }
    streak += 1;
  }

  currentStreak = streak;
  return { longestStreak, currentStreak };
}

module.exports = { fetchGitHubStats };