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
  Grid,
  GridItem
} from "@chakra-ui/react";

const db = firebase.firestore();

const reducer = produce((state, action) => {
  switch (action.type) {
    case "add_player": {
      state.players.unshift({
        name: action.payload.name,
        rank: action.payload.rank
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
      const player = state.players[action.payload.index];
      player.checked = !player.checked;
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
          rank: p.rank
        }))
    };
  }, {});

  return db.collection("history").add({
    timestamp: new Date(),
    matches: savableMatches
  });
};
export default function App() {
  const [{ matches, players }, dispatch] = useStorageReducer(reducer, {
    players: [],
    matches: []
  });

  useEffect(() => {
    if (players.length) {
      return;
    }

    getPlayers().then((players) => {
      dispatch({
        type: "players_loaded",
        payload: players
      });
    });
  }, [players.length, dispatch]);

  return (
    <ChakraProvider>
      <div className="App">
        <Stack spacing={4} padding={4}>
          <Stack>
            <Box>
              <Button
                width="100%"
                onClick={() => {
                  const teams = makeTeams(shuffle(players), 1, 1);
                  dispatch({
                    type: "new_matches",
                    payload: teams
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
                    payload: teams
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
                    payload: teams
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
                padding={4}
                border="1px solid"
                borderColor="gray.300"
                borderRadius="5px"
                key={`match-${i}`}
              >
                <Stack spacing={4}>
                  <Box
                    as="h3"
                    paddingBottom={4}
                    borderBottom="1px solid"
                    borderColor="gray.300"
                  >
                    Group {i + 1}
                  </Box>
                  <Box>
                    {match.map((player = {}) => (
                      <p key={player.id}>{player.name}</p>
                    ))}
                  </Box>
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
                    payload: players
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
                  payload: { name: `${name} (Guest)`, rank, mode: "guest" }
                });
              }}
            />
            <AddPlayer
              type="Player"
              onSubmit={(name, rank) => {
                db.collection("players")
                  .add({
                    name,
                    rank
                  })
                  .then(() => {
                    dispatch({
                      type: "add_player",
                      payload: { name: `${name}`, rank }
                    });
                  });
              }}
            />
          </Stack>
          <SimpleGrid columns={1} spacing={4}>
            {players.map((p, i) => (
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
                          index: i
                        }
                      });
                    }}
                  />
                </GridItem>
                <GridItem colSpan={3}>
                  <FormLabel htmlFor={`switch-${p.id}`}>{p.name}</FormLabel>
                </GridItem>
                <GridItem>
                  <Input value={p.rank} onChange={() => {}} />
                </GridItem>
              </Grid>
            ))}
          </SimpleGrid>
        </Stack>
      </div>
    </ChakraProvider>
  );
}
