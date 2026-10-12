package githubcontributions

// query is the GraphQL text the Next.js handler sends, byte for byte,
// including its leading and trailing whitespace. The contract test compares
// it with the recorded text. A raw string drops carriage returns, so the
// value is the same however this file is checked out.
const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                  color
                }
              }
            }
          }
        }
      }
    `
