import React, { useState } from 'react';
import MaterialToolbar from '@mui/material/Toolbar';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import { blue, green } from '@mui/material/colors';
import { Link, StyledButton as Button } from 'components/common';
import MuiButton from '@mui/material/Button';
import { useRecoilValue } from 'recoil';
import { authState } from 'store';
import Notification from 'components/Notification';
import MenuComponent from 'components/Menu';
import Modal from '@mui/material/Modal';
import { APP_NAME, ASSET_FOLDER } from 'config.keys';
import ChatIcon from '@mui/icons-material/Chat'; // Import Chat Icon

const Toolbar = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const auth = useRecoilValue(authState);
  const [openLibrary, setOpenLibrary] = useState(false);
  const [openChatbot, setOpenChatbot] = useState(false);

  return (
    <div>
      <MenuComponent
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
      />
      <MaterialToolbar>
        <Stack
          direction="row"
          spacing={3}
          style={{ width: '100%' }}
          alignItems="center">
          <Box sx={{ flexGrow: 1 }}>
            <Link to="/">
              <MuiButton>
                <img
                  src={`/${ASSET_FOLDER}/logo192.png`}
                  alt="logo"
                  width="40px"
                  height="40px"
                />
                <Box
                  sx={{
                    display: { xs: 'none', sm: 'block' },
                  }}>
                  <strong
                    style={{
                      paddingLeft: '8px',
                      fontSize: '24px',
                      color: 'white',
                    }}>
                    {APP_NAME}
                  </strong>
                </Box>
              </MuiButton>
            </Link>
          </Box>

          {/* E-Library Button */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Button
              variant="contained"
              onClick={() => setOpenLibrary(true)}
              sx={{
                backgroundColor: blue[700],
                '&:hover': { backgroundColor: blue[600] },
              }}>
              E-library
            </Button>
          </Box>

          {/* AI Chatbot Circular Button */}
          <IconButton
            onClick={() => setOpenChatbot(true)}
            sx={{
              backgroundColor: green[600],
              color: 'white',
              '&:hover': { backgroundColor: green[500] },
              width: '45px',
              height: '45px',
              borderRadius: '50%',
            }}>
            <ChatIcon />
          </IconButton>

          {auth.isLoggedIn && <Notification />}
          
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Link to="/search">
              <Button>Get a match</Button>
            </Link>
          </Box>

          {!auth.isLoggedIn ? (
            <>
              <Link to={'/auth'}>
                <Button>Login</Button>
              </Link>
              <Link to={'/auth?page=signup'}>
                <Button
                  sx={{
                    backgroundColor: blue[900],
                    '&:hover': {
                      opacity: 1,
                      backgroundColor: blue[800],
                    },
                  }}
                  variant="contained"
                  size="large">
                  Signup
                </Button>
              </Link>
            </>
          ) : (
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar src={auth.user?.avatar?.url} alt={auth.user?.email} />
            </IconButton>
          )}
        </Stack>
      </MaterialToolbar>

      {/* E-Library Modal with iFrame */}
      <Modal
        open={openLibrary}
        onClose={() => setOpenLibrary(false)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
        <Box
          sx={{
            width: '80%',
            height: '80%',
            bgcolor: 'white',
            boxShadow: 24,
            p: 2,
            borderRadius: 2,
            position: 'relative',
          }}>
          <IconButton
            onClick={() => setOpenLibrary(false)}
            sx={{ position: 'absolute', top: 10, right: 10 }}>
            ✖
          </IconButton>
          <iframe
            src="http://dl.saintgits.org/jspui/"
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            title="E-Library"
          />
        </Box>
      </Modal>

      {/* AI Chatbot Modal with iFrame */}
      <Modal
        open={openChatbot}
        onClose={() => setOpenChatbot(false)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
        <Box
          sx={{
            width: '60%',
            height: '70%',
            bgcolor: 'white',
            boxShadow: 24,
            p: 2,
            borderRadius: 2,
            position: 'relative',
          }}>
          <IconButton
            onClick={() => setOpenChatbot(false)}
            sx={{ position: 'absolute', top: 10, right: 10 }}>
            ✖
          </IconButton>
          <iframe
            src="https://www.chatbase.co/chatbot-iframe/s0gBZKpeVWbaDGoR3v6Xa"
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            title="AI Chatbot"
          />
        </Box>
      </Modal>
    </div>
  );
};

export default Toolbar;
