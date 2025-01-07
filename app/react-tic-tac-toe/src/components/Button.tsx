import React from 'react';

type ButtonProps = {
    title: string;
    onClick: () => void;
    className?: string;
};

const Button: React.FC<ButtonProps> = ({ title, onClick, className }) => {
    return <button className={className} onClick={() => onClick()}>{title}</button>;
};

export default Button;
