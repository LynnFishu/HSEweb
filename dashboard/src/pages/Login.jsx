import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useAuth } from '../contexts/AuthContext';
import { Divider, Alert, Stack, ButtonGroup, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    workId: '',
    name: '',
    companyName: ''
  });
  const [errors, setErrors] = useState({});
  const [loginRole, setLoginRole] = useState('admin');
  const [submitError, setSubmitError] = useState('');

  const handleRoleChange = (event, newRole) => {
    if (newRole !== null) {
      setLoginRole(newRole);
      setFormData({
        email: '',
        password: '',
        workId: '',
        name: '',
        companyName: ''
      });
      setErrors({});
    }
  };

  const { checkWorkId } = useAuth();

  const handleWorkIdCheck = async (workId) => {
    try {
      const result = await checkWorkId(workId);
      if (result?.exists && result?.contractor) {
        const contractor = result.contractor;
        setFormData(prev => ({
          ...prev,
          name: contractor?.name || '',
          companyName: contractor?.company_name || '',
          email: contractor?.email || ''
        }));
        setErrors(prev => ({ ...prev, workId: '' }));
      } else {
        setErrors(prev => ({
          ...prev,
          workId: 'Invalid Work ID'
        }));
        // Clear contractor details
        setFormData(prev => ({
          ...prev,
          name: '',
          companyName: '',
          email: ''
        }));
      }
    } catch (error) {
      console.error('Error checking work ID:', error);
      setErrors(prev => ({
        ...prev,
        workId: 'Error checking Work ID'
      }));
    }
  };

  const validateEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));

    if (name === 'workId' && /^CONT-\d{4}-\d{3}$/.test(value)) {
      handleWorkIdCheck(value);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (loginRole === 'admin' && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (loginRole === 'contractor' && !formData.workId) {
      newErrors.workId = 'Work ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }
    
    try {
      const success = await login(
        formData.email, 
        formData.password, 
        loginRole === 'contractor' ? formData.workId : null
      );

      if (success) {
        navigate(loginRole === 'admin' ? '/admin/dashboard' : '/contractor/dashboard');
      } else {
        setSubmitError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setSubmitError('An error occurred. Please try again later.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(90deg, #c3a8f7 0%, #a8e6ef 100%)',
        p: 2
      }}
    >
      <Card sx={{ 
        maxWidth: 400, 
        width: '100%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: 3
      }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" sx={{ 
            textAlign: 'center', 
            color: '#2B3467',
            fontWeight: 600,
            mb: 1
          }}>
            Welcome Back
          </Typography>
          
          <Typography variant="body2" sx={{ 
            textAlign: 'center',
            color: '#677294',
            mb: 3
          }}>
            Please login to continue
          </Typography>

          {/* Role Selection */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2,
            mb: 3,
            justifyContent: 'center'
          }}>
            <Button
              variant={loginRole === 'admin' ? 'contained' : 'outlined'}
              onClick={() => handleRoleChange(null, 'admin')}
              sx={{
                flex: 1,
                bgcolor: loginRole === 'admin' ? '#2B3467' : 'transparent',
                color: loginRole === 'admin' ? 'white' : '#2B3467',
                borderColor: '#2B3467',
                '&:hover': {
                  bgcolor: loginRole === 'admin' ? '#1a1f3d' : 'rgba(43, 52, 103, 0.04)',
                  borderColor: '#2B3467'
                }
              }}
            >
              Admin
            </Button>
            <Button
              variant={loginRole === 'contractor' ? 'contained' : 'outlined'}
              onClick={() => handleRoleChange(null, 'contractor')}
              sx={{
                flex: 1,
                bgcolor: loginRole === 'contractor' ? '#2B3467' : 'transparent',
                color: loginRole === 'contractor' ? 'white' : '#2B3467',
                borderColor: '#2B3467',
                '&:hover': {
                  bgcolor: loginRole === 'contractor' ? '#1a1f3d' : 'rgba(43, 52, 103, 0.04)',
                  borderColor: '#2B3467'
                }
              }}
            >
              Contractor
            </Button>
          </Box>

          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {loginRole === 'contractor' && (
              <TextField
                fullWidth
                label="Work ID"
                name="workId"
                variant="outlined"
                size="small"
                value={formData.workId}
                onChange={handleChange}
                error={!!errors.workId}
                helperText={errors.workId || 'Format: CONT-2024-001'}
                placeholder="CONT-YYYY-XXX"
                required
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': {
                      borderColor: '#2B3467',
                    },
                  },
                }}
              />
            )}

            {loginRole === 'contractor' && formData.name && (
              <Box sx={{ 
                mb: 2,
                p: 2, 
                bgcolor: '#f8fafc', 
                borderRadius: 2,
                border: '1px solid #e0e0e0'
              }}>
                <Typography variant="subtitle2" sx={{ color: '#2B3467', fontWeight: 600, mb: 1 }}>
                  Contractor Details
                </Typography>
                <Typography variant="body2" sx={{ color: '#677294', mb: 0.5 }}>
                  Name: <span style={{ color: '#2B3467', fontWeight: 500 }}>{formData.name}</span>
                </Typography>
                <Typography variant="body2" sx={{ color: '#677294' }}>
                  Company: <span style={{ color: '#2B3467', fontWeight: 500 }}>{formData.companyName}</span>
                </Typography>
              </Box>
            )}

            {loginRole === 'admin' && (
              <TextField
                fullWidth
                label="Email"
                name="email"
                variant="outlined"
                size="small"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                autoComplete="email"
                required
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    '&:hover fieldset': {
                      borderColor: '#2B3467',
                    },
                  },
                }}
              />
            )}

            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              size="small"
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              required
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  '&:hover fieldset': {
                    borderColor: '#2B3467',
                  },
                },
              }}
            />

            <Button
              fullWidth
              variant="contained"
              type="submit"
              sx={{ 
                mt: 3,
                bgcolor: '#2B3467',
                color: 'white',
                py: 1.5,
                borderRadius: 1.5,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#1a1f3d',
                  boxShadow: 'none'
                }
              }}
            >
              Login
            </Button>

            {loginRole === 'contractor' && (
              <Button
                fullWidth
                variant="outlined"
                component={Link}
                to="/register"
                sx={{ 
                  mt: 2,
                  borderColor: '#e0e0e0',
                  color: '#2B3467',
                  py: 1.5,
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  '&:hover': {
                    borderColor: '#2B3467',
                    bgcolor: 'transparent'
                  }
                }}
              >
                Register as Contractor
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;