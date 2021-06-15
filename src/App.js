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
  Grid,
  GridItem,
  Flex,
} from "@chakra-ui/react";
import { FaSeedling, FaSearch } from "react-icons/fa";

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
    const savableState = { players: state.players, matches: [] };
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

  return (
    <ChakraProvider>
      <div className="App">
        <Stack spacing={4} padding={4}>
          <Stack spacing={8}>
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
                Generate Best on Best Teams
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
                Generate upto 50% threshold Teams
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
                Generate upto 100% threshold teams
              </Button>
            </Box>
          </Stack>
          <Stack direction="column" spacing={4} padding={4}>
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
          <Stack spacing={4}>
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
              type="Player"
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
          <Box
            onClick={() => {
              dispatch({
                type: "toggle_show_ranking",
              });
            }}
          >
            Show rankings
          </Box>
          <Box>
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
            </InputGroup>
          </Box>
          <SimpleGrid columns={1} spacing={4}>
            {filterPlayers(filter, players).map((p, i) => (
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
        </Stack>
      </div>
    </ChakraProvider>
  );
}
