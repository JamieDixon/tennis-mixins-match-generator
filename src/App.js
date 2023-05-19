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
  Icon,
  Fade,
} from "@chakra-ui/react";
import { FaSeedling, FaSearch, FaTimesCircle } from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTennisBall } from "@fortawesome/pro-duotone-svg-icons";

const db = firebase.firestore();

const randomId = () => Math.random().toString(36).substr(2, 9);

const group = (size, elements) => {
  let res = [];
  for (let i = 0; i <= elements.length - 1; i += size) {
    res.push(elements.slice(i, i + size));
  }

  return res;
};

const Person = ({ p, showRankings, dispatch, i }) => {
  return (
    <Stack
      key={p.id}
      as={FormControl}
      direction="row"
      padding={2}
      _hover={{ backgroundColor: "gray.100" }}
      justifyContent="space-between"
      alignItems="center"
      spacing={4}
    >
      <Switch
        id={`switch-${p.id}`}
        width="fit-content"
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
      <FormLabel htmlFor={`switch-${p.id}`} flex={1}>
        {p.name}
      </FormLabel>
      {showRankings ? (
        <Box>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={p.rank}
            background="white"
            onChange={(e) => {
              dispatch({
                type: "update_player",
                payload: {
                  id: p.id,
                  rank: e.target.value,
                },
              });
            }}
            onBlur={() => {
              db.collection("players")
                .doc(p.id)
                .update({
                  rank: parseFloat(p.rank),
                });
            }}
          />
        </Box>
      ) : null}
    </Stack>
  );
};

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
    <Grid templateColumns="repeat(11, 1fr)" gap={2}>
      <GridItem colSpan={5}>
        <Input
          placeholder={`${type} name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          background="white"
        />
      </GridItem>
      <GridItem colSpan={5}>
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
          width="100%"
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

const Loading = ({ loading, children, minShowTime = 1000 }) => {
  const [loaded, setLoaded] = useState(!loading);
  const [then] = useState(Date.now());

  useEffect(() => {
    // Ensure that loading UI displays for at least minShowTime
    // This prevents a janky loading experience.
    const now = Date.now();
    const elapsed = now - then;
    const wait = minShowTime - elapsed;

    const id = setTimeout(() => {
      setLoaded(!loading);
    }, wait);

    return () => {
      clearTimeout(id);
    };
  }, [loading]);

  return (
    <>
      <Fade in={!loaded} unmountOnExit>
        <Box position="absolute" top="0" left="0" bottom="0" right="0">
          <Flex alignItems="center" justifyContent="center" height="100vh">
            <Logo />
          </Flex>
        </Box>
      </Fade>
      <Fade in={loaded}>{children}</Fade>
    </>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    firebase.auth().onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  return (
    <ChakraProvider>
      <Box
        color="gray.500"
        maxWidth="900px"
        margin="0 auto"
        minHeight="100vh"
        position="relative"
      >
        <Loading loading={loading}>{user ? <MainApp /> : <LogIn />}</Loading>
      </Box>
    </ChakraProvider>
  );
}

const Logo = () => {
  return (
    <Stack spacing={2} textAlign="center" background="white">
      <Stack direction="row" spacing={2} alignItems="center">
        <Icon
          as={FontAwesomeIcon}
          icon={faTennisBall}
          color="green.300"
          size="2x"
        />
        <Heading size="2xl" textTransform="uppercase">
          Tennis.Social
        </Heading>
      </Stack>
      <Text>Social sessions made easy</Text>
    </Stack>
  );
};

function LogIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Stack justifyContent="center" alignItems="center" height="100vh">
      <Logo />
      <Flex
        width="100%"
        justifyContent="center"
        alignItems="center"
        padding={4}
      >
        <Stack
          as="form"
          spacing={4}
          padding={4}
          border="1px solid"
          borderColor="gray.300"
          borderRadius="7px"
          width="100%"
          onSubmit={(e) => {
            e.preventDefault();
            firebase
              .auth()
              .signInWithEmailAndPassword(username, password)
              .catch((e) => {
                console.log(e);
              });
          }}
        >
          <FormControl>
            <Input
              name="email"
              type="email"
              placeholder="Email Address"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <Input
              name="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <Button width="100%">Sign In</Button>
          </FormControl>
        </Stack>
      </Flex>
      <Text fontSize="xs">&copy; Jamie Dixon {new Date().getFullYear()}</Text>
    </Stack>
  );
}

function MainApp() {
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

  const checkedPlayers = players.filter((p) => p.checked);

  // All players with search filters applied
  const filteredPlayers = filterPlayers(filter, players);

  // Checked players with search filters applied
  const todaysPlayers = filterPlayers(filter, checkedPlayers);

  return (
    <Stack spacing={4}>
      <Flex padding={4} alignItems="center" justifyContent="center">
        <Logo />
      </Flex>
      <Stack spacing={8} padding={4} paddingBottom={0}>
        <Box>
          <Button
            width="100%"
            onClick={() => {
              const teams = makeTeams(
                [...players].sort((a, b) => b.rank - a.rank),
                0,
                0
              );
              dispatch({
                type: "new_matches",
                payload: teams,
              });

              saveMatchesHistory(teams);
            }}
          >
            Organise absolute best matches
          </Button>
        </Box>
        <Box>
          <Button
            width="100%"
            onClick={() => {
              const teams = makeTeams(shuffle(checkedPlayers), 0, 0);
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
              const teams = makeTeams(shuffle(checkedPlayers), 0.5, 0.5);
              dispatch({
                type: "new_matches",
                payload: teams,
              });

              saveMatchesHistory(teams);
            }}
          >
            Organise 50% leeway matches
          </Button>
        </Box>
        <Box>
          <Button
            width="100%"
            onClick={() => {
              const teams = group(4, shuffle(checkedPlayers));

              dispatch({
                type: "new_matches",
                payload: teams,
              });
              saveMatchesHistory(teams);
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
                background="orange.100"
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
                    <Box>
                      {player.name} {showRankings ? player.rank : ""}
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>
      <Stack>
        <Box padding={4}>
          <Heading size="md">Add new player</Heading>
          <Text fontSize="sm">
            (Guest players will not be saved for future sessions)
          </Text>
        </Box>

        <Stack
          spacing={4}
          padding={4}
          paddingTop={4}
          paddingBottom={8}
          background="green.300"
        >
          <Grid
            templateColumns="repeat(5, 1fr)"
            color="white"
            fontWeight="bold"
          >
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
      <Stack padding={4}>
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
          Deselect all ({todaysPlayers.length})
        </Button>
      </Stack>
      <Stack spacing={4}>
        <Heading fontSize="md" padding={4}>
          Today's players ({todaysPlayers.length})
        </Heading>
        <SimpleGrid
          columns={1}
          spacing={4}
          background="green.100"
          borderRadius="lg"
          padding={2}
        >
          {todaysPlayers.length ? (
            todaysPlayers.map((p, i) => (
              <Person
                p={p}
                showRankings={showRankings}
                key={`person_${i}`}
                dispatch={dispatch}
                i={i}
              />
            ))
          ) : (
            <Box>No players selected</Box>
          )}
        </SimpleGrid>
      </Stack>

      <Stack spacing={4}>
        <Heading fontSize="md" padding={4}>
          All players
        </Heading>
        <SimpleGrid columns={1} spacing={4}>
          {filteredPlayers.map((p, i) => (
            <Person
              p={p}
              showRankings={showRankings}
              key={`person_${i}`}
              dispatch={dispatch}
              i={i}
            />
          ))}
        </SimpleGrid>
      </Stack>
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
      <Button
        onClick={() => {
          dispatch({
            type: "toggle_show_ranking",
          });
        }}
      >
        {showRankings ? "Hide" : "Show"} rankings
      </Button>
      <Button
        onClick={() => {
          firebase.auth().signOut();
        }}
      >
        Log Out
      </Button>
    </Stack>
  );
}
