import React, {FC, ReactNode, useMemo} from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import {clusterApiUrl, Connection, PublicKey} from '@solana/web3.js';
import {PhantomWalletAdapter, SolflareWalletAdapter} from "@solana/wallet-adapter-wallets";
import {Provider} from "@coral-xyz/anchor";

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');

interface WalletProps {
    app: ReactNode;
}

export class SimpleProvider implements Provider {
    readonly connection: Connection;
    readonly publicKey?: PublicKey;

    constructor(connection: Connection, publicKey?: PublicKey) {
        this.connection = connection;
        this.publicKey = publicKey;
    }
}

export const Wallet: FC<WalletProps> = ({ app }) => {
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(() => [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
    ], []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {app}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};