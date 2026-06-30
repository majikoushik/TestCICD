import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import tokenService from '../../services/tokenService';

// Async thunks
export const fetchTokenBalance = createAsyncThunk(
  'tokens/fetchTokenBalance',
  async (_, { rejectWithValue }) => {
    try {
      const balance = await tokenService.getTokenBalance();
      return balance;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch token balance');
    }
  }
);

export const fetchTokenTransactions = createAsyncThunk(
  'tokens/fetchTokenTransactions',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const transactions = await tokenService.getTokenTransactions(filters);
      return transactions;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch token transactions');
    }
  }
);

export const fetchRedemptionServices = createAsyncThunk(
  'tokens/fetchRedemptionServices',
  async (_, { rejectWithValue }) => {
    try {
      const services = await tokenService.getRedemptionServices();
      return services;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch redemption services');
    }
  }
);

export const fetchTokenEarnSources = createAsyncThunk(
  'tokens/fetchTokenEarnSources',
  async (_, { rejectWithValue }) => {
    try {
      const sources = await tokenService.getTokenEarnSources();
      return sources;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch token earn sources');
    }
  }
);

export const transferTokens = createAsyncThunk(
  'tokens/transferTokens',
  async (transferData, { rejectWithValue, dispatch }) => {
    try {
      const response = await tokenService.transferTokens(transferData);
      // Refresh both balance and transaction list after transfer
      dispatch(fetchTokenBalance());
      dispatch(fetchTokenTransactions());
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to transfer tokens');
    }
  }
);

export const redeemTokens = createAsyncThunk(
  'tokens/redeemTokens',
  async (redemptionData, { rejectWithValue, dispatch }) => {
    try {
      const response = await tokenService.redeemTokens(redemptionData);
      // After successful redemption, refresh the balance
      dispatch(fetchTokenBalance());
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to redeem tokens');
    }
  }
);

const initialState = {
  balance: 0,
  walletAddress: null,
  transactions: [],
  redemptionServices: [],
  earnSources: [],
  loading: {
    balance: false,
    transactions: false,
    services: false,
    sources: false,
    transfer: false,
    redeem: false,
  },
  error: null,
  transactionResult: null,
  redemptionResult: null,
};

const tokenSlice = createSlice({
  name: 'tokens',
  initialState,
  reducers: {
    updateTokenBalance: (state, action) => {
      state.balance = action.payload;
    },
    clearTokenError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchTokenBalance
      .addCase(fetchTokenBalance.pending, (state) => {
        state.loading.balance = true;
        state.error = null;
      })
      .addCase(fetchTokenBalance.fulfilled, (state, action) => {
        state.loading.balance = false;
        if (action.payload && action.payload.data) {
          // Real API: { success, data: { tokenBalance, walletAddress } }
          state.balance = action.payload.data.tokenBalance ?? action.payload.data.balance ?? 0;
          if (action.payload.data.walletAddress) {
            state.walletAddress = action.payload.data.walletAddress;
          }
        } else {
          // mockResponse flat shape: { balance }
          state.balance = action.payload?.tokenBalance ?? action.payload?.balance ?? 0;
        }
      })
      .addCase(fetchTokenBalance.rejected, (state, action) => {
        state.loading.balance = false;
        state.error = action.payload || 'Failed to fetch token balance';
      })
      
      // Handle fetchTokenTransactions
      .addCase(fetchTokenTransactions.pending, (state) => {
        state.loading.transactions = true;
        state.error = null;
      })
      .addCase(fetchTokenTransactions.fulfilled, (state, action) => {
        state.loading.transactions = false;
        // Both real and synthetic endpoints return { data: [...txArray...] }
        // Normalize type names: 'earn' → 'earned', 'spend' → 'spent'
        const normType = (t) => t === 'earn' ? 'earned' : t === 'spend' ? 'spent' : (t || 'earned');
        const raw = action.payload?.data
          ? (Array.isArray(action.payload.data) ? action.payload.data : (action.payload.data.transactions || []))
          : (action.payload?.transactions || []);
        state.transactions = raw.map(tx => ({ ...tx, id: tx._id || tx.id, type: normType(tx.type) }));
      })
      .addCase(fetchTokenTransactions.rejected, (state, action) => {
        state.loading.transactions = false;
        state.error = action.payload || 'Failed to fetch token transactions';
      })
      
      // Handle fetchRedemptionServices
      .addCase(fetchRedemptionServices.pending, (state) => {
        state.loading.services = true;
        state.error = null;
      })
      .addCase(fetchRedemptionServices.fulfilled, (state, action) => {
        state.loading.services = false;
        // Handle nested response structure from mockResponse
        if (action.payload && action.payload.data) {
          state.redemptionServices = action.payload.data || [];
        } else {
          state.redemptionServices = action.payload || [];
        }
      })
      .addCase(fetchRedemptionServices.rejected, (state, action) => {
        state.loading.services = false;
        state.error = action.payload || 'Failed to fetch redemption services';
      })
      
      // Handle fetchTokenEarnSources
      .addCase(fetchTokenEarnSources.pending, (state) => {
        state.loading.sources = true;
        state.error = null;
      })
      .addCase(fetchTokenEarnSources.fulfilled, (state, action) => {
        state.loading.sources = false;
        // Handle nested response structure from mockResponse
        if (action.payload && action.payload.data) {
          state.earnSources = action.payload.data || [];
        } else {
          state.earnSources = action.payload || [];
        }
      })
      .addCase(fetchTokenEarnSources.rejected, (state, action) => {
        state.loading.sources = false;
        state.error = action.payload || 'Failed to fetch token earn sources';
      })
      
      // Handle transferTokens
      .addCase(transferTokens.pending, (state) => {
        state.loading.transfer = true;
        state.error = null;
        state.transactionResult = null;
      })
      .addCase(transferTokens.fulfilled, (state, action) => {
        state.loading.transfer = false;
        state.transactionResult = action.payload;
      })
      .addCase(transferTokens.rejected, (state, action) => {
        state.loading.transfer = false;
        state.error = action.payload || 'Failed to transfer tokens';
      })
      
      // Handle redeemTokens
      .addCase(redeemTokens.pending, (state) => {
        state.loading.redeem = true;
        state.error = null;
        state.redemptionResult = null;
      })
      .addCase(redeemTokens.fulfilled, (state, action) => {
        state.loading.redeem = false;
        state.redemptionResult = action.payload;
      })
      .addCase(redeemTokens.rejected, (state, action) => {
        state.loading.redeem = false;
        state.error = action.payload || 'Failed to redeem tokens';
      });
  },
});

// Export actions
export const { updateTokenBalance, clearTokenError } = tokenSlice.actions;

// Export selectors
export const selectTokenBalance = (state) => state.tokens.balance;
export const selectTokenWalletAddress = (state) => state.tokens.walletAddress;
export const selectTokenTransactions = (state) => state.tokens.transactions;
export const selectRedemptionServices = (state) => state.tokens.redemptionServices;
export const selectTokenEarnSources = (state) => state.tokens.earnSources;
export const selectTokenLoading = (state) => state.tokens.loading;
export const selectTokenError = (state) => state.tokens.error;
export const selectTransactionResult = (state) => state.tokens.transactionResult;
export const selectRedemptionResult = (state) => state.tokens.redemptionResult;

export default tokenSlice.reducer;
