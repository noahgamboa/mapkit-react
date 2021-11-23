import * as React from 'react';
import Menu from '@mui/material/Menu';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import PropTypes from 'prop-types';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import Typography from '@mui/material/Typography';
import { blue } from '@mui/material/colors';
import LooksOneIcon from '@mui/icons-material/LooksOne';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import LooksThreeIcon from '@mui/icons-material/Looks3';
import LooksFourIcon from '@mui/icons-material/Looks4';

const SignInDropDownMenu = (props) => {
    const { open, anchorEl, handleClose } = props
    const [aboutOpen, setAboutOpen] = React.useState(false);
    return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem>
          <Avatar /> Sign In
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setAboutOpen(true)}>
            About
        </MenuItem>
      </Menu>
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)}/>
    </>
    );
}
export default SignInDropDownMenu


function AboutDialog(props) {
  const { open, onClose } = props;

  return (
  <Dialog open={open} onClose={() => onClose()}>
      <DialogTitle>Find your Home</DialogTitle>
      <DialogContent>
          <DialogContentText>
              This app is designed to help you find a place that you would want to live. Here's how you can use it
              <List>
                  <ListItem><ListItemIcon><LooksOneIcon/></ListItemIcon><ListItemText>Find a search region by manipulating the map to contain the entire region you would want to live in and then clicking "Set Search Region".</ListItemText></ListItem>
                  <ListItem><ListItemIcon><LooksTwoIcon/></ListItemIcon><ListItemText>Search for a place in that region you would want to be near.</ListItemText></ListItem>
                  <ListItem><ListItemIcon><LooksThreeIcon/></ListItemIcon><ListItemText>Click on that place and add it as a destination.</ListItemText></ListItem>
                  <ListItem><ListItemIcon><LooksFourIcon/></ListItemIcon><ListItemText>Click generate to see all the places you could live within a 30 minute walk of that place.</ListItemText></ListItem>
              </List>
                  With the destination view now visible, you can edit how you want to get to a place as well as create groups of places that would allow you to be near any of the places in that group. Have fun! for questions, reach out to noah@gamboafamily.com
          </DialogContentText>
      </DialogContent>
    </Dialog>
  );
}
