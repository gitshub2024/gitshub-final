import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FieldValues } from 'react-hook-form';
import { Card, Stepper, Step, StepLabel, LinearProgress } from '@mui/material';
import { LocalizationProvider } from '@mui/lab';
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import ExperienceStep from './ExperienceStep';
import ProfileStep from './ProfileStep';
import AvailabilityStep from './AvailabilityStep';
import { convertToFormData } from 'utils/api-helper';
import axios from 'axios';
import { SERVER_URL } from 'config.keys';
import useHttp from 'hooks/useHttp';
import { toast } from 'react-toastify';
import { transformSlots } from 'utils/helper';
import moment from 'moment';
import useLocalState from 'hooks/useLocalState';
import { UserType } from 'types';

const SignUpSteps: React.FC = () => {
  const { loading, sendRequest } = useHttp();
  const navigate = useNavigate();
  const location = useLocation();
  const newlySignedUp = location.state?.newlySignedUp || false;
  const email = location.state?.email; // Email passed from signup

  console.log('Location State:', location.state);
  console.log('Email from signup:', email);

  // If no email is provided, redirect to signup
  if (!email) {
    console.warn('No email provided in location state, redirecting to auth...');
    navigate('/auth');
    return null;
  }

  // Use temporary keys since no userId exists yet
  const [formData, setFormData] = useLocalState<{
    [key: number]: FieldValues;
  }>('-register-form', {
    0: {
      email: email || '',
      first_name: '',
      last_name: '',
      is_mentor: false, // Default to false, updated by ProfileStep
    },
  });
  const [activeStep, setActiveStep] = useLocalState('-active-step', 0);
  const [interests, setInterests] = useLocalState<string[]>('-interests', []);

  // Dynamic steps based on is_mentor
  const steps = formData[0]?.is_mentor
    ? ['Profile', 'Experience', 'Availability']
    : ['Profile'];

  const getTopicsArray = (topics: any) => {
    const topicsArray: any[] = [];
    for (const key of Object.keys(topics)) {
      for (const topic of topics[key]) {
        topicsArray.push(topic);
      }
    }
    return topicsArray;
  };

  const onContinue = (step: number, data: FieldValues) => {
    console.log('Step:', step, 'Data:', data);

    if (step === steps.length - 1) {
      const apiData = convertToFormData({
        ...formData[0],
        ...(formData[0].is_mentor && {
          ...formData[1],
          timeSlots: transformSlots(formData[2]?.slots || []),
          topics: getTopicsArray(formData[1]?.topics || []),
        }),
        interests,
        timezone: moment.tz.guess(),
        email, // Ensure email is included
      });

      sendRequest(
        async () => {
          const response = await axios.post<UserType>(
            `${SERVER_URL}/api/register`,
            apiData,
            { withCredentials: true },
          );
          return response.data;
        },
        (data: UserType) => {
          localStorage.removeItem('-register-form');
          localStorage.removeItem('-active-step');
          localStorage.removeItem('-interests');
          toast.success(`Please verify your email to continue.`);
          navigate('/email-verification', { state: { email } });
        },
        (error: any) => {
          toast.error(`Registration failed: ${error.response?.data?.message || 'Unknown error'}`);
        },
      );
    } else {
      setFormData({
        ...formData,
        [step]: { ...data },
      });
      setActiveStep(activeStep + 1);
    }
  };

  const onBack = (step: number, data: FieldValues) => {
    setFormData({
      ...formData,
      [step]: { ...data },
    });
    setActiveStep(activeStep - 1);
  };

  const renderStep = (step: number) => {
    console.log('Rendering step:', step);
    switch (step) {
      case 0:
        return (
          <ProfileStep
            onContinue={onContinue}
            hydrate={formData[step]}
            interests={interests}
            setInterests={setInterests}
            isMentor={formData[0]?.is_mentor || false}
          />
        );
      case 1:
        return (
          <ExperienceStep
            onBack={onBack}
            onContinue={onContinue}
            hydrate={formData[step]}
          />
        );
      case 2:
        return (
          <AvailabilityStep
            onBack={onBack}
            onContinue={onContinue}
            hydrate={formData[step]}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card
      elevation={10}
      sx={{
        px: 5,
        py: 5,
        borderRadius: '8px',
        position: 'relative',
        width: { sm: '100%', md: '60%' },
      }}
    >
      {loading && (
        <LinearProgress
          variant="indeterminate"
          sx={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
        />
      )}
      {formData[0]?.is_mentor && (
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      )}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        {renderStep(activeStep)}
      </LocalizationProvider>
    </Card>
  );
};

export default SignUpSteps;