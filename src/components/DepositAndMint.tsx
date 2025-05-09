"use client";

import {
  FormControl,
  Input,
  Button,
  useSteps,
  useToast,
  Heading,
  Box,
  Tag,
  TagLabel,
  Flex,
  Select,
  TagCloseButton,
  Text,
  Link,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import {
  TransactionStepper,
  steps,
} from "@/components/steppers/TransactionStepper";
import { Explaination, StepperContext } from "@/data-schema/enums";
import { transactionErrors } from "@/utils/errorHanding";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { ethers } from "ethers";
import { SignatureLike } from "@ethersproject/bytes";
import { User } from "@/data-schema/types";
import { MdArrowDropDown } from "react-icons/md";
import UsdcTokenIcon from "@/components/icons/UsdcIcon";
import { createStableTokenPermitMessage } from "@/utils/permit";
import NextLink from "next/link";
import { createActivity } from "@/services/mongo/routes/activity";
import { convertTimestampToSeconds } from "@/utils/dateTime";
import { IActivity } from "@/models/Activity";
import { stable_coin_symbol } from "@/config";
import { getSigner, getSignerAddress } from "@/blockchain/utils";
import { GOERLI_DK_STABLETOKEN_ADDRESS } from "@/blockchain/contract-addresses";
import { stableTokenABI } from "@/blockchain/artifacts/stable-token";
import DefiDollarsContract from "@/blockchain/DefiDollars";
import { getUserByWalletAddress } from "@/services/mongo/routes/user";
import { useAuthStore } from "@/store/auth/authStore";
import shallow from "zustand/shallow";

type PermitResult = {
  data?: SignatureLike;
  deadline?: number;
  error?: string;
};

export const DepositAndMint = ({
  members,
  onClose,
  setExplaination,
  setShowExplanation,
  stableTokenBalance,
  getStableTokenBalance,
}: {
  members: User[];
  onClose: () => void;
  setExplaination: (explaination: Explaination) => void;
  setShowExplanation: (show: boolean) => void;
  stableTokenBalance: number;
  getStableTokenBalance: () => void;
}) => {
  //=============================================================================
  //                               STATE
  //=============================================================================
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User>();

  //=============================================================================
  //                               HOOKS
  //=============================================================================

  const toast = useToast();

  const { activeStep, setActiveStep } = useSteps({
    index: 1,
    count: steps.length,
  });

  const { setRecentActivity } = useAuthStore(
    (state) => ({
      setRecentActivity: state.setRecentActivity,
    }),
    shallow
  );

  useEffect(() => {
    const init = async () => {
      // Get the user details
      const user = await getUserByWalletAddress(await getSignerAddress());
      setUser(user);
    };
    init();
  }, []);

  //=============================================================================
  //                               FUNCTIONS
  //=============================================================================

  const validiateInputs = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Please select at least one user",
        status: "error",
      });
      return;
    }

    if (!amount) {
      toast({
        title: "Please enter an amount",
        status: "error",
      });
      return;
    }

    return true;
  };

  const handlePermit = async () => {
    setActiveStep(0); // set to signing message

    const totalValueToPermit = ethers.parseEther(
      String(+amount.trim() * selectedUsers.length)
    );

    //@ts-ignore
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await getSigner(provider);
    const defiDollarsInstance = await DefiDollarsContract.fromProvider();

    const stableTokenContractInstance = new ethers.Contract(
      GOERLI_DK_STABLETOKEN_ADDRESS,
      stableTokenABI,
      signer
    );

    const result = (await createStableTokenPermitMessage(
      signer,
      await defiDollarsInstance.contractAddress(),
      totalValueToPermit,
      stableTokenContractInstance!
    )) as PermitResult;

    return result;
  };

  const handleTransaction = async (
    deadline: number,
    v: number,
    r: string,
    s: string
  ) => {
    setActiveStep(1); // set to approve transaction

    //@ts-ignore
    const provider = new ethers.BrowserProvider(window.ethereum);
    const defiDollarsInstance = await DefiDollarsContract.fromProvider(
      provider
    );

    const formattedAmount = ethers.parseEther(String(+amount.trim()));
    const recipients = selectedUsers.map((user) => user.wallet);

    const tx = (await defiDollarsInstance?.depositAndMint(
      formattedAmount,
      recipients,
      deadline,
      v,
      r,
      s
    )) as TransactionResponse;

    return tx;
  };

  const postTransaction = async () => {
    toast({
      title: "Allowance Sent Successful",
      status: "success",
    });

    //@ts-ignore

    const accountId = user?.accountId;
    const newActivities: IActivity[] = [];

    await Promise.all(
      selectedUsers.map(async (user) => {
        const newActivity = await createActivity({
          accountId,
          wallet: user.wallet,
          date: convertTimestampToSeconds(Date.now()),
          type: `Sent allowance. ${amount.trim()} ${stable_coin_symbol} to ${
            user.username
          }`,
        });
        newActivities.push(newActivity);
      })
    );

    setRecentActivity(newActivities);
    getStableTokenBalance();
    onClose();
    resetState();
  };

  const resetState = () => {
    setIsLoading(false);
    setAmount("");
    setSelectedUsers([]);
  };

  const handleDeposit = async () => {
    if (!validiateInputs()) return;

    try {
      setIsLoading(true);
      const result = (await handlePermit()) as PermitResult;

      if (result.error) {
        throw new Error(result.error);
      }

      const deadline = result.deadline as number;
      const { r, s, v } = result.data as {
        r: string;
        s: string;
        v: number;
      };

      const tx = await handleTransaction(deadline, v, r, s);

      setActiveStep(2); // set to waiting for confirmation
      await tx.wait();

      await postTransaction();
    } catch (e) {
      const errorDetails = transactionErrors(e);
      toast(errorDetails);
      resetState();
    }
  };

  const depositComponent = () => {
    return (
      <Box>
        <Flex alignItems="center" justify="center">
          <UsdcTokenIcon width={40} height={40} />
          <Flex direction="row" alignItems="baseline" justify="center" my={5}>
            <Heading size="xl" display="flex" alignItems="baseline" ml={3}>
              {`${Number(stableTokenBalance).toFixed(2)}`}
            </Heading>
            <Text fontSize="sm" ml={2}>
              {stable_coin_symbol}
            </Text>
          </Flex>
        </Flex>

        {selectedUsers &&
          selectedUsers?.length > 0 &&
          selectedUsers?.map((user, index) => (
            <Tag
              size="lg"
              colorScheme="purple"
              borderRadius="full"
              variant="solid"
              key={index}
              mr={2}
            >
              <Flex align="center" p={1}>
                <TagLabel color="black" fontWeight="bold">
                  {user.username}
                </TagLabel>
                <TagCloseButton
                  color="black"
                  onClick={() => {
                    setSelectedUsers((prev) => prev.filter((u) => u !== user));
                  }}
                />
              </Flex>
            </Tag>
          ))}

        <Flex direction="row" justify="flex-end" align="center">
          <Text fontSize="xs" ml={3}>
            <Link
              as={NextLink}
              color="blue.500"
              href="#"
              onClick={() => {
                setExplaination(Explaination.ALLOWANCE);
                setShowExplanation(true);
              }}
            >
              How it works?
            </Link>
          </Text>
        </Flex>

        <FormControl>
          <Select
            placeholder="Select user"
            mb={2}
            mt={2}
            style={{
              border: "1px solid lightgray",
            }}
            icon={<MdArrowDropDown />}
            onChange={(e) => {
              const selectedUsername = e.target.value;
              if (selectedUsername === "") return;

              const selectedUser = members.find(
                (member) => member.username === selectedUsername
              );

              if (selectedUsers.includes(selectedUser!)) {
                e.target.value = "";
                return;
              }

              setSelectedUsers((prev) => [...prev, selectedUser!]);
              e.target.value = "";
            }}
          >
            {members.map((member) => (
              <option key={member.username}>{member.username}</option>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <Input
            placeholder="Amount per user"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              border: "1px solid lightgray",
            }}
            sx={{
              "::placeholder": {
                color: "gray.400",
              },
            }}
          />
        </FormControl>
      </Box>
    );
  };

  return (
    <Box>
      {isLoading ? (
        <TransactionStepper
          activeStep={activeStep}
          context={StepperContext.PERMIT}
        />
      ) : (
        depositComponent()
      )}

      {!isLoading && (
        <Flex justifyContent="flex-end" mt={5}>
          <Button colorScheme="blue" onClick={handleDeposit}>
            Send Allowance
          </Button>
        </Flex>
      )}
    </Box>
  );
};
