import React, {useCallback, useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import Button from "./components/Button";
import Square from "./components/Square";
import {
    AddEntity,
    ApplySystem,
    CreateSession,
    FindComponentPda,
    FindWorldPda,
    InitializeComponent,
    Session,
    anchor,
} from "@magicblock-labs/bolt-sdk";
import {WalletNotConnectedError} from '@solana/wallet-adapter-base';
import {useConnection, useWallet} from '@solana/wallet-adapter-react';
import {WalletMultiButton} from "@solana/wallet-adapter-react-ui";
import Alert from "./components/Alert";
import {AccountInfo, Keypair, PublicKey, Signer, Transaction} from "@solana/web3.js";
import {BN, Program, Provider} from "@coral-xyz/anchor";
import {SimpleProvider} from "./components/Wallet";
import Active from "./components/Active";

const WORLD_INSTANCE_ID = 1;

// Components
const GRID_COMPONENT = new PublicKey("9EoKMqQqrgRAxVED34q17e466RKme5sTUkuCqUGH4bij");
const PLAYERS_COMPONENT = new PublicKey("HLzXXTbMUjemRSQr5LHjtZgBvqyieuhY8wE29xYzhZSX");

// Systems
const JOIN_GAME = new PublicKey("7TsTc97MB21EKbh2RetcWsGWRJ4xuMkPKKD4DcMJ2Sms");
const PLAY = new PublicKey("EFLfG5icLgcUYwuSnuScoYptcrgh8WYLHx33M4wvTPFv");

const App: React.FC = () => {
    let { connection } = useConnection();
    const provider = useRef<Provider>(new SimpleProvider(connection));
    anchor.setProvider(provider.current);
    const { publicKey, sendTransaction, signTransaction } = useWallet();
    const [squares, setSquares] = useState<string[]>(Array(9).fill(""));
    const [turn, setTurn] = useState<"x" | "o">("x");
    const [p1, setP1] = useState<boolean>(false);
    const [p2, setP2] = useState<boolean>(false);
    const [amIP1, setAmIP1] = useState<boolean>(true);
    const [winner, setWinner] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [transactionError, setTransactionError] = useState<string | null>(null);
    const [transactionSuccess, setTransactionSuccess] = useState<string | null>(null);
    let session = useRef<Session | null>(null);
    let entityMatch = useRef<PublicKey | null>(null);
    let gameId = useRef<PublicKey | null>(null);
    let playersComponentSubscriptionId = useRef<number | null>(null);
    let gridComponentSubscriptionId= useRef<number | null>(null);

    // Use useRef for persisting values without causing re-renders
    const playersComponentClient = useRef<Program | null>(null);
    const gridComponentClient = useRef<Program | null>(null);

    // Helpers to Dynamically fetch the IDL and initialize the components clients
    const getComponentsClient = useCallback(async (component: PublicKey): Promise<Program> => {
        const idl = await Program.fetchIdl(component, provider.current);
        if (!idl) throw new Error('IDL not found');
        // Initialize the program with the dynamically fetched IDL
        return new Program(idl, provider.current);
    }, [provider]);

    // Initialize the components clients to access the parsed account data
    useEffect(() => {
        const initializeComponents = async () => {
            playersComponentClient.current = await getComponentsClient(PLAYERS_COMPONENT);
            gridComponentClient.current = await getComponentsClient(GRID_COMPONENT);
        };
        initializeComponents().catch(console.error);
    }, [connection, getComponentsClient]);

    useEffect(() => {
        const checkEndTheGame = (): boolean => {
            for (let square of squares) {
                if (!square) return false;
            }
            return true;
        };

        const checkWinner = (): string | null => {
            const combos: number[][] = [
                [0, 1, 2],
                [3, 4, 5],
                [6, 7, 8],
                [0, 3, 6],
                [1, 4, 7],
                [2, 5, 8],
                [0, 4, 8],
                [2, 4, 6],
            ];
            for (let combo of combos) {
                const [a, b, c] = combo;
                if (
                    squares[a] &&
                    squares[a] === squares[b] &&
                    squares[a] === squares[c]
                ) {
                    return squares[a];
                }
            }
            return null;
        };

        const W = checkWinner();
        if (W) {
            setWinner(W);
        } else if (checkEndTheGame()) {
            setWinner("x | o");
        }
    }, [squares] );

    const updatePlayersComponent = useCallback((players: any) => {
        console.log("Updating players component", players);
        players.players[0] !== null ? setP1(true) : setP1(false);
        players.players[1] !== null ? setP2(true) : setP2(false);
        setAmIP1(players.players[0] !== null && players.players[0].equals(publicKey));
    }, [setP1, setP2, publicKey]);

    const updateGridComponent = useCallback((grid: any) => {
        console.log("Updating grid component", grid);
        let gridArray = grid.board[0].concat(grid.board[1], grid.board[2]) as any[];
        gridArray = gridArray.map(item => {
            if (!item) {
                return "";
            } else if (item["x"]) {
                return "x";
            } else {
                return "o";
            }
        });
        setSquares(gridArray);
        setTurn(grid.isFirstPlayerTurn ? "x" : "o");
    }, [setSquares, setTurn]);

    // Define callbacks function to handle account changes
    const handlePlayersComponentChange = useCallback((accountInfo: AccountInfo<Buffer>) => {
        const parsedData = playersComponentClient.current?.coder.accounts.decode("players", accountInfo.data);
        updatePlayersComponent(parsedData);
    }, [updatePlayersComponent]);


    const handleGridComponentChange = useCallback((accountInfo: AccountInfo<Buffer>) => {
        const parsedData = gridComponentClient.current?.coder.accounts.decode("grid", accountInfo.data);
        updateGridComponent(parsedData);
    }, [updateGridComponent]);


    // Subscribe to the game state
    const subscribeToGame = useCallback(async (): Promise<void> => {
        if (!entityMatch.current) return;
        console.log("Subscribing to game", entityMatch.current.toBase58());

        if (playersComponentSubscriptionId && playersComponentSubscriptionId.current) await connection.removeAccountChangeListener(playersComponentSubscriptionId.current);
        if (gridComponentSubscriptionId && gridComponentSubscriptionId.current) await connection.removeAccountChangeListener(gridComponentSubscriptionId.current);

        // Subscribe to players changes
        const playersComponent = FindComponentPda({ componentId: PLAYERS_COMPONENT, entity: entityMatch.current });
        playersComponentSubscriptionId.current = connection.onAccountChange(playersComponent, handlePlayersComponentChange, 'processed');

        // Subscribe to grid changes
        const gridComponent = FindComponentPda({ componentId: GRID_COMPONENT, entity: entityMatch.current });
        gridComponentSubscriptionId.current = connection.onAccountChange(gridComponent, handleGridComponentChange, 'processed');

        // @ts-ignore
        playersComponentClient.current?.account.players.fetch(playersComponent, "processed").then(updatePlayersComponent);
        // @ts-ignore
        gridComponentClient.current?.account.grid.fetch(gridComponent, "processed").then(updateGridComponent);
    }, [connection, handlePlayersComponentChange, handleGridComponentChange, updatePlayersComponent, updateGridComponent]);

    const resetGame = (): void => {
        setSquares(Array(9).fill(""));
        setTurn("x");
        setWinner(null);
        newGameTx().then(() => {});
    };

    const updateSquares = (ind: string | number): void => {
        const index = typeof ind === 'string' ? parseInt(ind, 10) : ind;
        const row = Math.floor(index / 3);
        const column = index % 3;
        if ((amIP1 && turn !== "x") || (!amIP1 && turn !== "o")){
            setTransactionError("Not your turn");
            return;
        }
        playTx(row, column).then(() => {});
    };

    const handleGameIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        try {
            gameId.current = new PublicKey(newValue);
        } catch {
        }
    };

    const submitTransaction = useCallback(async (transaction: Transaction): Promise<string | null> => {
        if (isSubmitting) return null;
        setIsSubmitting(true);
        setTransactionError(null);
        setTransactionSuccess(null);
        try {
            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight }
            } = await connection.getLatestBlockhashAndContext();
            let signature = null;

            if (session.current) {
                signature = await connection.sendTransaction(transaction, [session.current.signer as Signer], {minContextSlot});
            } else {
                signature = await sendTransaction(transaction, connection, { minContextSlot })
            }
            
            await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, "processed");

            // Transaction was successful
            setTransactionSuccess(`Transaction confirmed`);
            return signature;
        } catch (error) {
            setTransactionError(`Transaction failed: ${error}`);
        } finally {
            setIsSubmitting(false);
        }
        return null;
    }, [connection, isSubmitting, sendTransaction, signTransaction]);

    async function createSession() {
        const create_session = await CreateSession({
            authority: publicKey as PublicKey,
            topUp: new BN(100000000)
        });
        const blockhash = await connection.getLatestBlockhash();
        create_session.transaction.recentBlockhash = blockhash.blockhash;
        try {
            create_session.transaction.feePayer = publicKey as PublicKey;
            create_session.transaction.partialSign(create_session.session.signer as Signer);
        } catch (error) {
            console.log("Failed to sign transaction", error);
        }

        const signature = await submitTransaction(create_session.transaction);
        session.current = create_session.session;
        if (signature == null) {
            throw new Error("Failed to create session");
        }
    }

    /**
     * Create a new game transaction
     */
    const newGameTx = useCallback(async () => {
        if (!publicKey) throw new WalletNotConnectedError();
    
        try {	
            await createSession();
        } catch (error) {
            setTransactionError(`Failed to create session: ${error}`);
            return;
        }

        const worldPda = FindWorldPda({ worldId: new BN(WORLD_INSTANCE_ID) });
     
        // Create the entity
        const addEntity = await AddEntity({
            payer: session.current?.signer.publicKey as PublicKey,
            world: worldPda,
            connection: connection,
        });
        const transaction = addEntity.transaction;
        
        entityMatch.current = addEntity.entityPda;
        gameId.current = addEntity.entityPda;

        // Initialize the grid component
        const initGridIx = (await InitializeComponent({
            payer: session.current?.signer.publicKey as PublicKey,
            entity: entityMatch.current,
            componentId: GRID_COMPONENT,
        })).instruction;

        // Initialize the player component
        const initPlayersIx = (await InitializeComponent({
            payer: session.current?.signer.publicKey as PublicKey,
            entity: entityMatch.current,
            componentId: PLAYERS_COMPONENT,
        })).instruction;

        // Join the game
        const joinGame = (await ApplySystem({
            authority: publicKey,
            systemId: JOIN_GAME,
            world: worldPda,
            session: session.current as Session,
            entities: [
                {
                    entity: entityMatch.current,
                    components: [{ componentId: PLAYERS_COMPONENT }]
                }
            ],
        })).instruction;

        transaction.add(initGridIx);
        transaction.add(initPlayersIx);
        transaction.add(joinGame);

        const signature = await submitTransaction(transaction);
        console.log("Signature", signature);
        if (signature != null) {
            await subscribeToGame();
        }
    }, [publicKey, connection, submitTransaction, subscribeToGame]);

    /**
     * Create a new join game transaction
     */
    const joinGameTx = useCallback(async () => {
        if (!publicKey) throw new WalletNotConnectedError();
        if (gameId.current == null) setTransactionError("Enter a game ID");

        try {
            await createSession();
        } catch (error) {
            setTransactionError(`Failed to create session: ${error}`);
            return;
        }
        
        const entity = gameId.current as PublicKey;
        const worldPda = FindWorldPda({ worldId: new BN(WORLD_INSTANCE_ID) });

        const applySystem = await ApplySystem({
            authority: publicKey,
            systemId: JOIN_GAME,
            world: worldPda,
            session: session.current as Session,
            entities: [
                {
                    entity,
                    components: [{ componentId: PLAYERS_COMPONENT }]
                }
            ]
        });
        const transaction = applySystem.transaction;
        entityMatch.current = gameId.current;
        const signature = await submitTransaction(transaction);
        if (signature != null) {
            await subscribeToGame();
        }
    }, [publicKey, submitTransaction, subscribeToGame, session]);

    /**
     * Play transaction
     */
    const playTx = useCallback(async (row: number, column: number) => {
        if (!publicKey) {
            setTransactionError("Connect wallet");
            return;
        }
        if (!entityMatch.current) {
            setTransactionError("Create or join a game first");
            return;
        }
        const worldPda = FindWorldPda({ worldId: new BN(WORLD_INSTANCE_ID) });
        // Make a move
        const makeMove = await ApplySystem({
            authority: publicKey,
            systemId: PLAY,
            world: worldPda,
            session: session.current as Session,
            entities: [
                {
                    entity: entityMatch.current,
                    components: [{ componentId: GRID_COMPONENT }, { componentId: PLAYERS_COMPONENT }]
                }
            ],
            args: {
                row: row,
                column: column
            }
        });

        const transaction = makeMove.transaction;
        await submitTransaction(transaction);
    }, [publicKey, entityMatch, submitTransaction, session]);

    return (
        <div className="tic-tac-toe">
            <div className="wallet-buttons">
                <WalletMultiButton />
            </div>

            <h1> TIC-TAC-TOE </h1>

            <Button title={"New Game"} resetGame={newGameTx} />
            <div className="join-game">
                <input
                    type="text"
                    placeholder="Enter Game ID"
                    value={gameId.current?.toBase58()}
                    onChange={handleGameIdChange}
                />
                <Button title={"Join"} resetGame={joinGameTx} />
            </div>
            <div className="game">
                {Array.from("012345678").map((ind) => (
                    <Square
                        key={ind}
                        ind={ind}
                        updateSquares={updateSquares}
                        clsName={squares[parseInt(ind, 10)]}
                    />
                ))}
            </div>
            <div className={`turn ${turn === "x" ? "left" : "right"}`}>
                <Square clsName="x" />
                <Square clsName="o" />
            </div>
            <div className={"active-div"}>
                <Active clsName={`${p1 ? "on" : "off"}`} />
                <Active clsName={`${p2 ? "on" : "off"}`} />
            </div>
            <AnimatePresence>
                {winner && (
                    <motion.div
                        key={"parent-box"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="winner"
                    >
                        <motion.div
                            key={"child-box"}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="text"
                        >
                            <motion.h2
                                initial={{ scale: 0, y: 100 }}
                                animate={{
                                    scale: 1,
                                    y: 0,
                                    transition: {
                                        y: { delay: 0.7 },
                                        duration: 0.7,
                                    },
                                }}
                            >
                                {winner === "x | o"
                                    ? "No Winner :/"
                                    : "Win !! :)"}
                            </motion.h2>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{
                                    scale: 1,
                                    transition: {
                                        delay: 1.3,
                                        duration: 0.2,
                                    },
                                }}
                                className="win"
                            >
                                {winner === "x | o" ? (
                                    <>
                                        <Square clsName="x" />
                                        <Square clsName="o" />
                                    </>
                                ) : (
                                    <>
                                        <Square clsName={winner} />
                                    </>
                                )}
                            </motion.div>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{
                                    scale: 1,
                                    transition: { delay: 1.5, duration: 0.3 },
                                }}
                            >
                                <Button title={"New Game"} resetGame={resetGame} />
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {isSubmitting && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    position: 'fixed',
                    bottom: '20px',
                    left: 0,
                    width: '100%',
                    zIndex: 1000,
                }}>
                    <div className="spinner"></div>
                </div>
            )}

            {transactionError && <Alert type="error" message={transactionError} onClose={() => setTransactionError(null) } />}

            {transactionSuccess && <Alert type="success" message={transactionSuccess} onClose={() => setTransactionSuccess(null) } />}

            <img src={`${process.env.PUBLIC_URL}/magicblock_white.svg`} alt="Magic Block Logo" className="magicblock-logo" />
        </div>
    );
};

export default App;