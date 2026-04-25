import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
} from "@mui/material";
import { AccountCircle } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { jwt } from "../utils/index.js";
import * as api from "../api/index.js";

export default function Profile() {
  const navigate    = useNavigate();
  const { id }      = useParams();
  const currentUser = jwt.getUser();

  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);

  // Edit state
  const [username, setUsername] = useState("");
  const [email,    setEmail]    = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [errors,   setErrors]   = useState({});
  const [snackbar, setSnackbar] = useState({
    open:    false,
    message: "",
    type:    "success",
  });

  // ── Φόρτωσε το profile ──────────────────────
  useEffect(() => {
    if (!currentUser?.id) {
      navigate("/");
      return;
    }

    api.getProfile(id || currentUser.id)
      .then((data) => {
        setProfile(data.profile);
        setUsername(data.profile.username);
        setEmail(data.profile.email);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        showSnackbar("Failed to load profile", "error");
      });
  }, []);

  function showSnackbar(message, type = "success") {
    setSnackbar({ open: true, message, type });
  }

  function hideSnackbar() {
    setSnackbar((s) => ({ ...s, open: false }));
  }

  // ── Αποθήκευσε αλλαγές profile ──────────────
  async function saveProfile(e) {
    e.preventDefault();
    setErrors({});

    try {
      const data = await api.updateProfile(id || currentUser.id, {
        username,
        email,
      });

      if (!data.success) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        else showSnackbar(data.message, "error");
        return;
      }

      setProfile(data.profile);
      setEditing(false);
      showSnackbar("Profile updated successfully!");
    } catch {
      showSnackbar("Failed to update profile", "error");
    }
  }

  // ── Αλλαγή password ──────────────────────────
  async function changePassword(e) {
    e.preventDefault();
    setErrors({});

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    if (newPassword.length < 8) {
      setErrors({ newPassword: "Password must be at least 8 characters" });
      return;
    }

    try {
      const data = await api.updateProfile(id || currentUser.id, {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!data.success) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        else showSnackbar(data.message, "error");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSnackbar("Password changed successfully!");
    } catch {
      showSnackbar("Failed to change password", "error");
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    // ✅ profile-page
    <Box data-testid="profile-page" sx={{ maxWidth: 700, mx: "auto", p: 3 }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        My Profile
      </Typography>

      {/* ── Στοιχεία Account ── */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <AccountCircle sx={{ fontSize: 48, color: "primary.main" }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {profile?.username}
            </Typography>
            {/* ✅ profile-role */}
            <Chip
              data-testid="profile-role"
              label={profile?.role}
              size="small"
              color="primary"
              sx={{ textTransform: "capitalize" }}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">USERNAME</Typography>
            {/* ✅ profile-username */}
            <Typography data-testid="profile-username" fontWeight="bold">
              {profile?.username}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">EMAIL</Typography>
            {/* ✅ profile-email */}
            <Typography data-testid="profile-email" fontWeight="bold">
              {profile?.email}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">MEMBER SINCE</Typography>
            {/* ✅ profile-created-at */}
            <Typography data-testid="profile-created-at" fontWeight="bold">
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString()
                : "—"}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">LAST ACTIVE</Typography>
            {/* ✅ profile-last-active */}
            <Typography data-testid="profile-last-active" fontWeight="bold">
              {profile?.lastActive
                ? new Date(profile.lastActive).toLocaleDateString()
                : "—"}
            </Typography>
          </Box>
        </Box>

        <Box mt={2}>
          {/* ✅ profile-edit-button */}
          <Button
            data-testid="profile-edit-button"
            variant="outlined"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? "Cancel" : "Edit Profile"}
          </Button>
        </Box>
      </Paper>

      {/* ── Form Επεξεργασίας ── */}
      {editing && (
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            Edit Profile
          </Typography>

          <form onSubmit={saveProfile}>
            <Box display="flex" flexDirection="column" gap={2}>
              {/* ✅ profile-username input */}
              <TextField
                label="Username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrors((p) => ({ ...p, username: undefined }));
                }}
                error={!!errors.username}
                helperText={errors.username}
                inputProps={{ "data-testid": "profile-username" }}
                fullWidth
              />
              {/* ✅ profile-email input */}
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((p) => ({ ...p, email: undefined }));
                }}
                error={!!errors.email}
                helperText={errors.email}
                inputProps={{ "data-testid": "profile-email" }}
                fullWidth
              />
              <Box display="flex" justifyContent="flex-end">
                {/* ✅ profile-save-button */}
                <Button
                  data-testid="profile-save-button"
                  type="submit"
                  variant="contained"
                  color="primary"
                >
                  Save Changes
                </Button>
              </Box>
            </Box>
          </form>
        </Paper>
      )}

      {/* ── Form Αλλαγής Password ── */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Change Password
        </Typography>

        <form onSubmit={changePassword}>
          <Box display="flex" flexDirection="column" gap={2}>
            {/* ✅ profile-password-current */}
            <TextField
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setErrors((p) => ({ ...p, currentPassword: undefined }));
              }}
              error={!!errors.currentPassword}
              helperText={errors.currentPassword}
              inputProps={{ "data-testid": "profile-password-current" }}
              fullWidth
            />
            {/* ✅ profile-password-new */}
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setErrors((p) => ({ ...p, newPassword: undefined }));
              }}
              error={!!errors.newPassword}
              helperText={errors.newPassword ?? "At least 8 characters"}
              inputProps={{ "data-testid": "profile-password-new" }}
              fullWidth
            />
            {/* ✅ profile-password-confirm */}
            <TextField
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((p) => ({ ...p, confirmPassword: undefined }));
              }}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              inputProps={{ "data-testid": "profile-password-confirm" }}
              fullWidth
            />
            <Box display="flex" justifyContent="flex-end">
              {/* ✅ profile-password-save */}
              <Button
                data-testid="profile-password-save"
                type="submit"
                variant="contained"
                color="secondary"
              >
                Change Password
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>

      {/* ✅ profile-success-message */}
      {snackbar.type === "success" && (
        <Box data-testid="profile-success-message" sx={{ display: "none" }} />
      )}

      {/* ✅ profile-error-message */}
      {snackbar.type === "error" && (
        <Box data-testid="profile-error-message" sx={{ display: "none" }} />
      )}

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          data-testid={snackbar.type === "success" ? "profile-success-message" : "profile-error-message"}
          onClose={hideSnackbar}
          severity={snackbar.type}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}