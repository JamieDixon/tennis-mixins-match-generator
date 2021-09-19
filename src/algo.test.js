import { makeTeams, findPartner } from "./algo";

describe("Testing the matching algorithm", () => {
  it("Picks the very best players for a best-on-best match", () => {
    const players = [
      { name: "Toby", rank: 1, checked: true },
      { name: "Jamie", rank: 0.4, checked: true },
      { name: "Arif", rank: 0.9, checked: true },
      { name: "Nav", rank: 0.3, checked: true },
      { name: "Inga", rank: 0.2, checked: true },
      { name: "Irette", rank: 0.2, checked: true },
    ];

    const teams = makeTeams(
      [...players].sort((a, b) => b.rank - a.rank),
      0,
      0
    );
    const team1 = teams[0];
    expect(team1[0].name).toBe("Toby");
    expect(team1[1].name).toBe("Arif");
    expect(team1[2].name).toBe("Jamie");
    expect(team1[3].name).toBe("Nav");
  });

  it("Picks the right team based on an equal ranking", () => {
    const randomOrderedPlayers = [
      { name: "Inga", rank: 0.2, checked: true },
      { name: "Toby", rank: 1, checked: true },
      { name: "Jamie", rank: 0.4, checked: true },
      { name: "Arif", rank: 0.9, checked: true },
      { name: "Nav", rank: 0.3, checked: true },
      { name: "Irette", rank: 0.2, checked: true },
    ];

    const teams = makeTeams(randomOrderedPlayers, 0, 0);
    const team1 = teams[0];

    expect(team1[0].name).toBe("Inga");
    expect(team1[1].name).toBe("Irette");
    expect(team1[2].name).toBe("Nav");
    expect(team1[3].name).toBe("Jamie");
  });
});

describe("Finding a partner", () => {
  it("Picks the closest ranking player as a partner when threshold is 0-0", () => {
    const player = { name: "Inga", rank: 0.2, checked: true };
    const otherPlayers = [
      { name: "Toby", rank: 1, checked: true },
      { name: "Jamie", rank: 0.4, checked: true },
      { name: "Arif", rank: 0.9, checked: true },
      { name: "Nav", rank: 0.3, checked: true },
      { name: "Irette", rank: 0.2, checked: true },
    ];

    const partner = findPartner(player, otherPlayers, 0, 0);
    expect(partner.name).toBe("Irette");
  });

  it("Picks a partner whos half as good when threshold is 0.5-0.5 and no higher ranking player half as good is found", () => {
    const player = { name: "Toby", rank: 1, checked: true };
    const otherPlayers = [
      { name: "Nav", rank: 0.3, checked: true },
      { name: "Jamie", rank: 0.5, checked: true },
      { name: "Irette", rank: 0.2, checked: true },
      { name: "Inga", rank: 0.2, checked: true },
    ];

    const partner = findPartner(player, otherPlayers, 0.5, 0.5);
    expect(partner.name).toBe("Jamie");
  });

  it("Picks a partner whos half better when threshold is 0.5-0.5 and no lower ranking player half as good is found", () => {
    const player = { name: "Jamie", rank: 0.6, checked: true };
    const otherPlayers = [
      { name: "Toby", rank: 0.9, checked: true },
      { name: "Arif", rank: 0.2, checked: true },
      { name: "Nav", rank: 0.2, checked: true },
      { name: "Irette", rank: 0.2, checked: true },
      { name: "Inga", rank: 0.2, checked: true },
    ];

    const partner = findPartner(player, otherPlayers, 0.5, 0.5);
    expect(partner.name).toBe("Toby");
  });

  it("Picks a partner whos either half better or half as good based when threshold is 0.5-0.5", () => {
    const player = { name: "Jamie", rank: 0.6, checked: true };
    const otherPlayers = [
      { name: "Toby", rank: 0.9, checked: true },
      { name: "Nav", rank: 0.3, checked: true },
      { name: "Irette", rank: 0.2, checked: true },
      { name: "Inga", rank: 0.2, checked: true },
    ];

    const partner = findPartner(player, otherPlayers, 0.5, 0.5);
    expect(partner.name).toBeOneOf(["Toby", "Nav"]);
  });
});
