//

      if (data.success) {
        setUserId(data.userId);
        // Save credentials to localStorage for auto-login after verification
        localStorage.setItem('pendingLoginEmail', formData.email);
        localStorage.setItem('pendingLoginPassword', formData.password);
        setRegistrationSuccess(true);
      } else {