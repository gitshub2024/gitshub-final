import React from 'react';
import { styled } from '@mui/material/styles';
import { Typography, Hidden } from '@mui/material';

const TextWrapper = styled(Typography)({
  marginTop: '2rem',
  color: 'white',
  textAlign: 'center',
  fontWeight: 'bolder',
  fontSize: '3rem',
});

const CompaniesWrapper = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  padding: '2rem 1rem',
  img: {
    [theme.breakpoints.up('md')]: {
      width: '17vmin',
    },
    [theme.breakpoints.down('md')]: {
      width: '14vmin',
    },
  },
}));

const CompaniesHero = () => <Hidden smDown></Hidden>;

export default CompaniesHero;
