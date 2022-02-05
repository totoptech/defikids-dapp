import { ethers } from "ethers";
import React, { useState } from "react";
import Form from "react-bootstrap/Form";
import FormControl from "react-bootstrap/FormControl";
import InputGroup from "react-bootstrap/InputGroup";
import Modal from "react-bootstrap/Modal";
import { upgradeToken } from "../hooks/useSFCore";
import { useStore } from "../services/store";
import Arrow from "./arrow";
import Button from "./button";

interface IProps {
  show: boolean;
  onClose: () => void;
  onTransfer: (newBalance: number) => void;
}

const TopUpModal: React.FC<IProps> = ({ show, onClose, onTransfer }) => {
  const {
    state: { provider, wallet },
  } = useStore();
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleTransfer = async (amount: number) => {
    try {
      setLoading(true);
      const result = await upgradeToken(amount, provider, wallet);
      setLoading(false);
      onClose();
      onTransfer(
        parseFloat(ethers.utils.formatEther(result.newBalances.USDCxBalance))
      );
    } catch (error) {
      setLoading(false);
      console.error(error);
    }
  };

  return (
    <Modal show={show} onHide={onClose} dialogClassName="w-modal" size="lg">
      <Modal.Header closeButton className="mb-7 border-0 px-12 pt-12">
        <h1 className="text-xl">
          Top Up
          <br />
          Account
        </h1>
      </Modal.Header>
      <div className="flex px-12 pb-12 justify-between items-center">
        <div className="flex-1 mr-12">
          <InputGroup className="flex flex-col">
            <Form.Label htmlFor="name">Amount</Form.Label>
            <FormControl
              placeholder="USDC"
              aria-label="amount"
              type="number"
              style={{ width: "100%", borderRadius: 12 }}
              onChange={(value) =>
                setAmount(parseFloat(value.currentTarget.value))
              }
            />
          </InputGroup>
        </div>
        <Button
          className={loading && "animate-pulse pointer-events-none"}
          size="lg"
          onClick={() => handleTransfer(amount)}
          disabled={!amount || isNaN(amount)}
        >
          <div className="flex items-center">
            <span className="mr-6">Transfer</span>
            <Arrow dir="right" />
          </div>
        </Button>
      </div>
    </Modal>
  );
};

export default TopUpModal;
