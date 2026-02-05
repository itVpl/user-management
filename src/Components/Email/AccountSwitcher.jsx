import React from 'react';
import {
  Box,
  Select,
  MenuItem,
  FormControl,
  Chip,
  Typography,
  Avatar,
} from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';

const AccountSwitcher = ({ accounts, selectedAccountId, onAccountChange, sx = {} }) => {
  const selectedAccount = accounts.find(acc => acc._id === selectedAccountId);

  return (
    <FormControl size="small" sx={{ minWidth: 240, ...sx }}>
      <Select
        value={selectedAccountId || ''}
        onChange={(e) => onAccountChange(e.target.value)}
        displayEmpty
        renderValue={(value) => {
          const account = accounts.find(acc => acc._id === value);
          if (!account) return 'Select Account';
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  width: 24,
                  height: 24,
                  bgcolor: account.isDefault ? '#1a73e8' : '#5f6368',
                  fontSize: '0.75rem',
                }}
              >
                {account.email?.charAt(0).toUpperCase() || '?'}
              </Avatar>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.2 }}>
                  {account.displayName || account.email?.split('@')[0]?.toUpperCase() || 'Account'}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#5f6368', lineHeight: 1 }}>
                  {account.email}
                </Typography>
              </Box>
              {account.isDefault && (
                <Chip
                  label="Default"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: '#1a73e8',
                    color: 'white',
                    fontWeight: 500,
                    ml: 0.5,
                  }}
                />
              )}
            </Box>
          );
        }}
        sx={{
          height: 40,
          backgroundColor: '#e8f0fe',
          borderRadius: 1,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1a73e8',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1557b0',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1a73e8',
          },
          '& .MuiSelect-select': {
            py: 0.75,
            px: 1.5,
            display: 'flex',
            alignItems: 'center',
          },
        }}
      >
        {accounts.length === 0 && (
          <MenuItem value="" disabled>
            <Typography variant="body2" sx={{ color: '#5f6368' }}>
              No accounts available
            </Typography>
          </MenuItem>
        )}
        {accounts.map((account) => (
          <MenuItem key={account._id} value={account._id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Avatar
                sx={{
                  width: 24,
                  height: 24,
                  bgcolor: account.isDefault ? '#1a73e8' : '#5f6368',
                  fontSize: '0.75rem',
                }}
              >
                {account.email?.charAt(0).toUpperCase() || '?'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: account.isDefault ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {account.displayName || account.email}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#5f6368',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  {account.email}
                </Typography>
              </Box>
              {account.isDefault && (
                <Chip
                  label="Default"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: '#1a73e8',
                    color: 'white',
                    fontWeight: 500,
                  }}
                />
              )}
              {selectedAccountId === account._id && (
                <CheckIcon sx={{ fontSize: 18, color: '#1a73e8' }} />
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default AccountSwitcher;
