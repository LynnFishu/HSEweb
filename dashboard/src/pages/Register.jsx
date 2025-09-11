import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  Divider
} from '@mui/material';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    companyName: '',
    workId: ''
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const validateWorkId = (workId) => {
    const workIdPattern = /^CONT-\d{4}-\d{3}$/;
    return workIdPattern.test(workId);
  };

  const validateEmail = (email) => {
    const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailPattern.test(email);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear errors when user types
    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.name) {
      newErrors.name = 'Name is required';
    }

    if (!formData.companyName) {
      newErrors.companyName = 'Company name is required';
    }

    if (!validateWorkId(formData.workId)) {
      newErrors.workId = 'Work ID format should be CONT-YYYY-XXX';
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
      // Prepare registration data without confirmPassword
      const registrationData = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        companyName: formData.companyName,
        workId: formData.workId
      };

      console.log('Sending registration data:', registrationData);
      const response = await fetch('http://localhost:5000/api/contractors/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(registrationData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();
      console.log('Registration successful:', data);
      navigate('/login', { state: { message: 'Registration successful! Please log in with your Work ID.' } });
    } catch (err) {
      console.error('Registration error:', err);
      setSubmitError(err.message || 'Registration failed. Please try again.');
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
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom textAlign="center" 
            sx={{ color: '#2B3467', fontWeight: 'bold', mb: 3 }}>
            Contractor Registration
          </Typography>

          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              variant="outlined"
              margin="normal"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              autoComplete="email"
            />

            <TextField
              fullWidth
              label="Full Name"
              name="name"
              variant="outlined"
              margin="normal"
              value={formData.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
            />

            <TextField
              fullWidth
              label="Company Name"
              name="companyName"
              variant="outlined"
              margin="normal"
              value={formData.companyName}
              onChange={handleChange}
              error={!!errors.companyName}
              helperText={errors.companyName}
            />

            <TextField
              fullWidth
              label="Work ID"
              name="workId"
              variant="outlined"
              margin="normal"
              value={formData.workId}
              onChange={handleChange}
              error={!!errors.workId}
              helperText={errors.workId || 'Format: CONT-2024-001'}
              placeholder="CONT-YYYY-XXX"
            />

            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              variant="outlined"
              margin="normal"
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              autoComplete="new-password"
            />

            <TextField
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              variant="outlined"
              margin="normal"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              autoComplete="new-password"
            />

            <Stack spacing={2} sx={{ mt: 3 }}>
              <Button
                fullWidth
                variant="contained"
                type="submit"
                sx={{ 
                  bgcolor: '#2B3467',
                  '&:hover': {
                    bgcolor: '#1a1f3d'
                  }
                }}
              >
                Register
              </Button>

              <Button
                fullWidth
                variant="outlined"
                component={Link}
                to="/login"
                sx={{ 
                  borderColor: '#2B3467',
                  color: '#2B3467',
                  '&:hover': {
                    borderColor: '#1a1f3d',
                    bgcolor: 'rgba(43, 52, 103, 0.05)'
                  }
                }}
              >
                Back to Login
              </Button>
            </Stack>
          </form>

          <Divider sx={{ my: 3 }} />
          
          <Typography variant="body2" color="textSecondary" textAlign="center">
            Already have an account? <Link to="/login" style={{ color: '#2B3467' }}>Login here</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;
