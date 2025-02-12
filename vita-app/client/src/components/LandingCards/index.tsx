import React, { FC } from 'react';
import { Grid } from '@mui/material';

import LandingCard from './Card';
import { APP_NAME } from 'config.keys';

const LandingCards: FC = () => (
  <Grid
    container
    m={8}
    spacing={2}
    sx={{
      display: { xs: 'none', sm: 'none', md: 'flex' },
      width: '80%',
      mx: 'auto',
    }}>
    <Grid item sm={12} md={6} sx={{ display: 'flex', flexGrow: 1 }}>
      <LandingCard
        title={`${APP_NAME} Community`}
        content="There's something for everybody. Follow along, chat on Discord, or read up on what we're doing."
        color="rgb(235, 84, 188)"
        link="https://discord.gg/gMngCPYD"
        button="Join Discord"
        minHeight="250px"
      />
    </Grid>

    <Grid item sm={12} md={6} sx={{ display: 'flex', flexGrow: 1 }}>
      <LandingCard
        title="Become a Mentor"
        content="Help us grow the community by becoming a mentor. We'll be happy to help you get started or you can become a mentee."
        color="rgb(20, 241, 149)"
        link="/auth"
        button="Become a Mentor"
        minHeight="250px"
      />
    </Grid>
  </Grid>
);

export default LandingCards;
