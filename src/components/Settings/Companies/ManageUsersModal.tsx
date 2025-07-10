Here's the fixed version with all missing closing brackets and tags added:

```jsx
// ... (previous code remains the same until the company info section)

                  <p className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full inline-block mt-1">
                    {company.claimed ? 
                      (translations?.claimed || 'Claimed') : 
                      (translations?.notClaimed || 'Not Claimed')
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    <span>{translations?.addUser || 'Add User'}</span>
                  </p>
                </div>
              </div>
            </div>

// ... (middle section remains the same)

                  </div>
                </div>
              )}
            </div>
          )}

// ... (rest of the code remains the same until the end)

```

The main issues were:
1. Missing closing `</p>` tag in the company info section
2. Missing closing `</div>` tags in the nested structure
3. Missing closing brackets for some conditional statements

The rest of the code structure appears to be correct. The fixed version should now render properly without any syntax errors.