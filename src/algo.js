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

const findPartner = (a, bs, minRankPercent, maxRankPercent) => {
  const maxRank = a.rank * maxRankPercent;
  const minRank = a.rank * minRankPercent;

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
    if (team.length === 4 || !player) {
      return team;
    }

    const partner = findPartner(
      player,
      rest.filter((p) => !team.includes(p)),
      min,
      max
    );
    return rest.length ? makeTeam([...team, partner]) : [...team, partner];
  };

  return makeTeam();
};

export const makeTeams = (players, minThreshold = 1, maxThreshold = 1) => {
  let mutPlayers = players.filter((p) => p.checked);
  let matches = [];

  while (mutPlayers.length > 0) {
    const match = quad(mutPlayers, minThreshold, maxThreshold);
    matches.push(match);
    mutPlayers = mutPlayers.filter((p) => !match.includes(p));
  }

  return matches;
};

export const shuffle = (array) => {
  const arr = [...array];
  var currentIndex = arr.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = arr[currentIndex];
    arr[currentIndex] = arr[randomIndex];
    arr[randomIndex] = temporaryValue;
  }

  return arr;
};
