const diff = (a, b) => Math.abs(a.rank - b.rank);

const findClosestPlayers = (a, bs) => {
  return bs.reduce(
    (winners, contender) => {
      const winDiff = winners.bestDiff;
      const contDiff = diff(a, contender);

      if (contDiff === winDiff) {
        return { ...winners, players: [...winners.players, contender] };
      }

      if (contDiff > winDiff) {
        return winners;
      }

      return { ...winners, bestDiff: contDiff, players: [contender] };
    },
    { players: [], bestDiff: 1 }
  ).players;
};

const round = (n) => Math.round(n * 10) / 10;

export const findPartner = (a, bs, minRankPercent, maxRankPercent) => {
  const rank = Number(a.rank);
  const maxRank = round(rank + rank * maxRankPercent);
  const minRank = round(rank - rank * minRankPercent);

  const allEligablePlayers = bs.filter(
    (player) => player.rank >= minRank && player.rank <= maxRank
  );

  const results =
    allEligablePlayers.length >= 1
      ? allEligablePlayers
      : findClosestPlayers(a, bs);

  return results[Math.floor(Math.random() * results.length)];
};

const quad = ([player, ...rest], min, max) => {
  const makeTeam = (team = [player]) => {
    const availablePartners = rest.filter((p) => !team.includes(p));

    if (team.length === 4 || !player || !availablePartners.length) {
      return team;
    }

    const partner = findPartner(player, availablePartners, min, max);

    return rest.length ? makeTeam([...team, partner]) : [...team, partner];
  };

  return makeTeam();
};

export const makeTeams = (players, minThreshold = 0, maxThreshold = 0) => {
  let mutPlayers = players.filter((p) => p.checked);
  let matches = [];

  while (mutPlayers.length > 0) {
    const match = quad(mutPlayers, minThreshold, maxThreshold);
    matches.push(match);
    mutPlayers = mutPlayers.filter((p) => !match.includes(p));
  }

  return matches;
};

// Fisher-yates algorithm
export function shuffle(array) {
  const arr = [...array];

  var m = arr.length,
    t,
    i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
}
