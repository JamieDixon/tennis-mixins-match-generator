import "./styles.css";
import { firebase } from "./firebase";
import { useEffect, useReducer, useState } from "react";
import { produce } from "immer";
import { makeTeams, shuffle } from "./algo";
import {
  ChakraProvider,
  Stack,
  Box,
  Switch,
  SimpleGrid,
  FormLabel,
  FormControl,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Grid,
  GridItem,
  Flex,
  Heading,
  Text,
} from "@chakra-ui/react";
import { FaSeedling, FaSearch, FaTimesCircle } from "react-icons/fa";

const db = firebase.firestore();

const randomId = () => Math.random().toString(36).substr(2, 9);

const reducer = produce((state, action) => {
  switch (action.type) {
    case "add_player": {
      const { id, name, rank } = action.payload;
      state.players.unshift({
        id,
        name,
        rank,
      });
      return state;
    }
    case "players_loaded": {
      state.players = [...action.payload].sort((p1, p2) =>
        p1.name < p2.name ? -1 : 1
      );
      return state;
    }
    case "new_matches": {
      state.matches = action.payload;
      return state;
    }
    case "select_player": {
      const player = state.players.find(
        (p) => p.id === action.payload.player.id
      );
      player.checked = !player.checked;
      return state;
    }
    case "toggle_show_ranking": {
      state.showRankings = !state.showRankings;
      return state;
    }
    case "update_player": {
      const { id, ...rest } = action.payload;
      const playerIndex = state.players.findIndex(
        (p) => p.id === action.payload.id
      );
      const newPlayer = { ...state.players[playerIndex], ...rest };
      state.players[playerIndex] = newPlayer;
      return state;
    }
    case "player_filter_type": {
      state.filter = action.payload;
      return state;
    }

    case "select_all_players": {
      action.payload.forEach((p) => {
        const player = state.players.find((pl) => pl.id === p.id);
        player.checked = true;
      });

      return state;
    }

    case "deselect_all_players": {
      action.payload.forEach((p) => {
        const player = state.players.find((pl) => pl.id === p.id);
        player.checked = false;
      });

      return state;
    }

    default: {
      return state;
    }
  }
});

const useStorageReducer = (reducer, defaultState) => {
  const localState = localStorage.getItem("state");
  const [state, dispatch] = useReducer(
    reducer,
    localState ? JSON.parse(localState) : defaultState
  );

  useEffect(() => {
    const savableState = {
      players: state.players,
      matches: [],
      filter: state.filter,
    };
    localStorage.setItem("state", JSON.stringify(savableState));
  }, [state]);

  return [state, dispatch];
};

const getPlayers = () =>
  db
    .collection("players")
    .get()
    .then((snap) => snap.docs)
    .then((docs) => docs.map((d) => ({ id: d.id, ...d.data() })));

const AddPlayer = ({ type, onSubmit }) => {
  const [name, setName] = useState("");
  const [rank, setRank] = useState(0);

  return (
    <Grid templateColumns="repeat(5, 1fr)" gap={2}>
      <GridItem colSpan={2}>
        <Input
          placeholder={`${type} name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          background="white"
        />
      </GridItem>
      <GridItem colSpan={2}>
        <Input
          placeholder={`${type} Rank`}
          type="number"
          step="0.1"
          min="0"
          value={rank}
          onChange={(e) => setRank(Number(e.target.value))}
          background="white"
        />
      </GridItem>
      <GridItem>
        <Button
          disabled={!name}
          onClick={() => {
            onSubmit(name, rank);
            setName("");
            setRank(0);
          }}
        >
          +
        </Button>
      </GridItem>
    </Grid>
  );
};

const saveMatchesHistory = (matches) => {
  const savableMatches = matches.reduce((agg, match, i) => {
    return {
      ...agg,
      [`group_${i + 1}`]: match
        .filter((x) => x)
        .map((p) => ({
          player: db.collection("players").doc(p.id),
          name: p.name,
          rank: p.rank,
        })),
    };
  }, {});

  return db.collection("history").add({
    timestamp: new Date(),
    matches: savableMatches,
  });
};

const filterPlayers = (filter, players) => {
  if (!filter) {
    return players;
  }

  return players.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  );
};

export default function App() {
  const [{ matches, players, showRankings, filter }, dispatch] =
    useStorageReducer(reducer, {
      players: [],
      matches: [],
      showRankings: false,
      filter: "",
    });

  useEffect(() => {
    if (players.length) {
      return;
    }

    getPlayers().then((players) => {
      dispatch({
        type: "players_loaded",
        payload: players,
      });
    });
  }, [players.length, dispatch]);

  const filteredPlayers = filterPlayers(filter, players);
  const selectedPlayers = players.filter((p) => p.checked);

  return (
    <ChakraProvider>
      <Box color="gray.500">
        <div className="App">
          <Stack spacing={4}>
            <Stack spacing={8} padding={4} paddingBottom={0}>
              <Box>
                <Button
                  width="100%"
                  onClick={() => {
                    const teams = makeTeams(shuffle(players), 1, 1);
                    dispatch({
                      type: "new_matches",
                      payload: teams,
                    });

                    saveMatchesHistory(teams);
                  }}
                >
                  Organise equal matches
                </Button>
              </Box>
              <Box>
                <Button
                  width="100%"
                  onClick={() => {
                    const teams = makeTeams(shuffle(players), 0.5, 0.5);
                    dispatch({
                      type: "new_matches",
                      payload: teams,
                    });
                  }}
                >
                  Organise 50% leeway matches
                </Button>
              </Box>
              <Box>
                <Button
                  width="100%"
                  onClick={() => {
                    const teams = makeTeams(
                      [...players].sort((a, b) => b.rank - a.rank),
                      0,
                      1
                    );
                    dispatch({
                      type: "new_matches",
                      payload: teams,
                    });
                  }}
                >
                  Organise random matches
                </Button>
              </Box>
            </Stack>
            <Stack direction="column" spacing={4} padding={4} paddingTop={0}>
              {matches.map((match, i) => (
                <Box
                  border="1px solid"
                  borderColor="gray.300"
                  borderRadius="5px"
                  key={`match-${i}`}
                  paddingBottom={4}
                >
                  <Stack spacing={4}>
                    <Flex
                      as="h3"
                      padding={2}
                      borderBottom="1px solid"
                      borderColor="gray.300"
                      background="#ffdac1"
                      justifyContent="center"
                      borderTopRadius="5px"
                    >
                      Group {i + 1}
                    </Flex>
                    <Stack alignItems="center">
                      {match.map((player = {}, i) => (
                        <Stack key={player.id} direction="row">
                          {i === 0 ? (
                            <Box as={FaSeedling} color="green.300" />
                          ) : (
                            <Box />
                          )}
                          <Box>{player.name}</Box>
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
            <Stack>
              <Heading size="md">Add new player</Heading>
              <Text fontSize="sm">
                (Guest players will not be saved for future sessions)
              </Text>

              <Stack
                spacing={4}
                padding={2}
                paddingTop={4}
                paddingBottom={4}
                background="green.300"
              >
                <Grid templateColumns="repeat(5, 1fr)" color="white">
                  <GridItem colSpan={2}>Name</GridItem>
                  <GridItem colSpan={2}>Rank</GridItem>
                </Grid>
                <AddPlayer
                  type="Guest"
                  onSubmit={(name, rank) => {
                    dispatch({
                      type: "add_player",
                      payload: {
                        name: `${name} (Guest)`,
                        rank,
                        mode: "guest",
                        id: randomId(),
                      },
                    });
                  }}
                />
                <AddPlayer
                  type="Member"
                  onSubmit={(name, rank) => {
                    db.collection("players")
                      .add({
                        name,
                        rank,
                      })
                      .then((snap) => {
                        dispatch({
                          type: "add_player",
                          payload: { name: `${name}`, rank, id: snap.id },
                        });
                      });
                  }}
                />
              </Stack>
            </Stack>
            <Box>Session player count: {selectedPlayers.length} </Box>
            <Box padding={4}>
              <InputGroup>
                <InputLeftElement
                  pointerEvents="none"
                  children={<Box as={FaSearch} color="gray.300" />}
                />
                <Input
                  placeholder="Filter players"
                  value={filter}
                  onChange={(e) => {
                    dispatch({
                      type: "player_filter_type",
                      payload: e.target.value,
                    });
                  }}
                />
                {filter ? (
                  <InputRightElement
                    children={<Box as={FaTimesCircle} color="gray.300" />}
                    onClick={() => {
                      dispatch({
                        type: "player_filter_type",
                        payload: "",
                      });
                    }}
                  />
                ) : null}
              </InputGroup>
            </Box>
            <Stack>
              <Button
                onClick={() => {
                  dispatch({
                    type: "select_all_players",
                    payload: filteredPlayers,
                  });
                }}
              >
                Select all ({filteredPlayers.length})
              </Button>
              <Button
                onClick={() => {
                  dispatch({
                    type: "deselect_all_players",
                    payload: filteredPlayers,
                  });
                }}
              >
                Deselect all ({filteredPlayers.filter((p) => p.checked).length})
              </Button>
            </Stack>
            <SimpleGrid columns={1} spacing={4}>
              {filteredPlayers.map((p, i) => (
                <Grid
                  key={p.id}
                  as={FormControl}
                  templateColumns="repeat(5, 1fr)"
                  gap={2}
                  padding={2}
                  _hover={{ backgroundColor: "gray.100" }}
                >
                  <GridItem colSpan={1}>
                    <Switch
                      id={`switch-${p.id}`}
                      isChecked={p.checked || false}
                      size="lg"
                      onChange={() => {
                        dispatch({
                          type: "select_player",
                          payload: {
                            player: p,
                            index: i,
                          },
                        });
                      }}
                    />
                  </GridItem>
                  <GridItem colSpan={3}>
                    <FormLabel htmlFor={`switch-${p.id}`}>{p.name}</FormLabel>
                  </GridItem>
                  {showRankings ? (
                    <GridItem>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={p.rank}
                        onChange={(e) => {
                          dispatch({
                            type: "update_player",
                            payload: {
                              id: p.id,
                              rank: Number(e.target.value),
                            },
                          });
                        }}
                        onBlur={() => {
                          db.collection("players").doc(p.id).update({
                            rank: p.rank,
                          });
                        }}
                      />
                    </GridItem>
                  ) : null}
                </Grid>
              ))}
            </SimpleGrid>
            <Button
              onClick={() => {
                getPlayers().then((players) => {
                  dispatch({
                    type: "players_loaded",
                    payload: players,
                  });
                });
              }}
            >
              Reset Players
            </Button>
            <Box
              onClick={() => {
                dispatch({
                  type: "toggle_show_ranking",
                });
              }}
            >
              Show rankings
            </Box>
          </Stack>
        </div>
      </Box>
    </ChakraProvider>
  );
}
