import {
  TransactionStepper,
  steps,
} from "@/components/steppers/TransactionStepper";
import { useAuthStore } from "@/store/auth/authStore";
import {
  Heading,
  VStack,
  Text,
  Box,
  FormControl,
  Input,
  Button,
  useToast,
  useSteps,
} from "@chakra-ui/react";
import { ethers, SignatureLike, TransactionResponse } from "ethers";
import { useState } from "react";
import shallow from "zustand/shallow";
import { StepperContext } from "@/data-schema/enums";
import { transactionErrors } from "@/utils/errorHanding";
import { convertTimestampToSeconds } from "@/utils/dateTime";
import { createActivity } from "@/services/mongo/routes/activity";
import { IActivity } from "@/models/Activity";
import TokenLockerContract from "@/blockchain/tokenLockers";
import { getSignerAddress } from "@/blockchain/utils";
import { getUserByWalletAddress } from "@/services/mongo/routes/user";

type PermitResult = {
  data?: SignatureLike;
  deadline?: number;
  error?: string;
};

export const RenameLocker = ({
  selectedLocker,
  onClose,
  setFetchLockers,
}: {
  selectedLocker: any;
  onClose: () => void;
  setFetchLockers: (fetchLockers: boolean) => void;
}) => {
  const [newLockerName, setNewLockerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const resetState = () => {
    setIsLoading(false);
    setNewLockerName("");
  };

  const handleTransaction = async () => {
    setActiveStep(0); // set to approve transaction

    // @ts-ignore
    const provider = new ethers.BrowserProvider(window.ethereum);
    const tokenLockerInstance = await TokenLockerContract.fromProvider(
      provider
    );

    const tx = (await tokenLockerInstance.renameLocker(
      selectedLocker.lockerNumber,
      newLockerName
    )) as TransactionResponse;

    return tx;
  };

  const postTransaction = async () => {
    toast({
      title: "Locker successfully renamed.",
      status: "success",
    });

    const address = await getSignerAddress();
    const user = await getUserByWalletAddress(address);
    const accountId = user?.accountId;

    const newActivities: IActivity[] = [];

    const newActivity = await createActivity({
      accountId,
      wallet: address,
      date: convertTimestampToSeconds(Date.now()),
      type: `Renamed TokenLocker (${selectedLocker.lockerName}) to ${newLockerName}`,
    });

    newActivities.push(newActivity);

    setRecentActivity(newActivities);
    onClose(); // close drawer
    resetState();
    setFetchLockers(true);
  };

  const handleContinue = async () => {
    // Validate input
    if (!newLockerName) {
      toast({
        title: "Error.",
        description: "No empty fields allowed.",
        status: "error",
      });
      return;
    }

    if (newLockerName.length > 20) {
      toast({
        title: "Error.",
        description: "Locker name must be less than 20 characters.",
        status: "error",
      });
      return;
    }

    try {
      setIsLoading(true); // show transaction stepper

      const tx = await handleTransaction();

      setActiveStep(1); // set to waiting for confirmation
      await tx.wait();

      await postTransaction();
    } catch (e) {
      const errorDetails = transactionErrors(e);
      toast(errorDetails);
      onClose(); // close drawer
      resetState();
    }
  };

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        <Heading fontSize={"xl"} mb={1}>
          {`Renaming locker ${selectedLocker.name}`}
        </Heading>
        <Text fontSize={"md"} mb={1}>
          It is recommended to give your locker a name that the is associated
          with the goal of the locker.
        </Text>

        <Text fontSize={"md"} mb={1}>
          You are free to choose any name you like.
        </Text>

        <FormControl>
          <Input
            disabled={isLoading}
            placeholder="New locker name"
            value={newLockerName}
            onChange={(e) => setNewLockerName(e.target.value)}
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
      </VStack>
      <Button
        isDisabled={isLoading}
        mt={4}
        colorScheme="blue"
        onClick={handleContinue}
      >
        Continue
      </Button>

      {isLoading && (
        <Box>
          <Heading fontSize={"xl"} my={5}>
            Updating the Blockchain
          </Heading>
          <TransactionStepper
            activeStep={activeStep}
            context={StepperContext.DEFAULT}
          />
        </Box>
      )}
    </Box>
  );
};
