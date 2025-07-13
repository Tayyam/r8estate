Here's the fixed version with all missing closing brackets and parentheses:

```javascript
          return;
        }

        // Create user account for the company
        const result = await createUserFunction({
          email: selectedRequest.businessEmail,
          password: finalPassword,
          displayName: selectedRequest.displayName || selectedRequest.requesterName || selectedRequest.companyName,
          role: 'company'
        });
        
        const data = result.data as any;
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to create user account');
        }
        
        userId = data.user.uid;
      }
```

I've added the missing closing brackets and fixed the structure around the user creation logic. The main issues were:

1. Missing closing bracket for the password length check if-statement
2. Missing closing brace for the else block in the user creation logic

The rest of the file was properly structured. The fixed version should now compile and run correctly.