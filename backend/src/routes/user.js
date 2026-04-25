import express from "express";
import path from "path"
import { createRequire } from "module";
import { email, validations } from "../utils/index.js";
import { User, Invitation } from "../models/index.js";

const require = createRequire(import.meta.url);
const router = express.Router({ mergeParams: true });

router.get("/decode/", (req, res) => res.json(res.locals.user));

router.get("/attempt-auth/", (req, res) => res.json({ ok: true }));

router.get("/", async (req, res) => {
	try {
		const users = await User.find();
		return res.json({ success: true, users });
	} catch (error) {
		return res.status(500).json({ message: "Something went wrong." });
	}
});

router.post("/",
	(req, res, next) => validations.validate(req, res, next, "invite"),
	async (req, res) => {
		try {
			const { email: userEmail } = req.body;

			const user = await User.findOne({ email: userEmail });
			if (user) {
				return res.json({
					success: false,
					message: "A user with this email already exists",
				});
			}

			const token = validations.jwtSign({ email: userEmail });
			await Invitation.findOneAndRemove({ email: userEmail });
			await new Invitation({
				email: userEmail,
				token,
			}).save();

			await email.inviteUser(userEmail, token);
			return res.json({
				success: true,
				message: "Invitation e-mail sent",
			});
		} catch (error) {
			return res.json({
				success: false,
				message: error.body,
			});
		}
	});

router.patch("/profile/:userId", async (req, res) => {
	try {
		const { userId } = req.params;
		const { username, email, currentPassword, newPassword, confirmPassword } = req.body;

		// ✅ Μόνο ο ίδιος χρήστης αλλάζει το profile του
		if (res.locals.user.id !== userId) {
			return res.status(403).json({ message: "Forbidden" });
		}

		// ✅ Φόρτωσε τον user με password για επαλήθευση
		const user = await User.findById(userId).select("+password");
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// ✅ Έλεγχος duplicate username
		if (username && username !== user.username) {
			const exists = await User.findOne({ username });
			if (exists) {
				return res.status(409).json({
					success: false,
					fieldErrors: { username: "Username is already taken" },
				});
			}
			user.username = username;
		}

		// ✅ Έλεγχος duplicate email
		if (email && email !== user.email) {
			const exists = await User.findOne({ email });
			if (exists) {
				return res.status(409).json({
					success: false,
					fieldErrors: { email: "Email is already registered" },
				});
			}
			user.email = email;
		}

		// ✅ Αλλαγή password
		if (currentPassword && newPassword) {
			// Έλεγχος ότι τα passwords ταιριάζουν
			if (newPassword !== confirmPassword) {
				return res.status(422).json({
					success: false,
					fieldErrors: { confirmPassword: "Passwords do not match" },
				});
			}

			// Έλεγχος μήκους
			if (newPassword.length < 8) {
				return res.status(422).json({
					success: false,
					fieldErrors: { newPassword: "Password must be at least 8 characters" },
				});
			}

			// ✅ Επαλήθευση current password
			const bcrypt = await import("bcryptjs");
			const valid = await bcrypt.default.compare(currentPassword, user.password);
			if (!valid) {
				return res.status(422).json({
					success: false,
					fieldErrors: { currentPassword: "Current password is incorrect" },
				});
			}

			// ✅ Hash το νέο password
			user.password = await bcrypt.default.hash(newPassword, 12);
		}

		// ✅ Ενημέρωσε lastActive
		user.lastActiveAt = new Date();
		await user.save();

		return res.json({
			success: true,
			message: "Profile updated successfully",
			profile: {
				id: user._id,
				username: user.username,
				email: user.email,
				role: user.role,
				createdAt: user.createdAt,
				lastActive: user.lastActiveAt,
			},
		});
	} catch (error) {
		return res.status(500).json({ message: "Something went wrong." });
	}
});

router.post("/delete", async (req, res) => {
	try {
		const { id } = req.body;
		const user = await User.findByIdAndDelete(id);
		if (user) {
			return res.json({ success: true });
		}

		return res.json({ success: false });
	} catch (error) {
		return res.status(500).json({ message: "Something went wrong." });
	}
});

router.post("/role", async (req, res) => {
	try {
		const { id, role } = req.body;
		const user = await User.findByIdAndUpdate(id, { role });
		if (user) {
			return res.json({ success: true });
		}

		return res.json({ success: false });
	} catch (error) {
		return res.status(500).json({ message: "Something went wrong." });
	}
});

router.get("/profile/:userId", async (req, res) => {
	try {
		const { userId } = req.params;

		if (res.locals.user.id !== userId) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const user = await User.findById(userId)
			.select("username email role createdAt lastActiveAt");



		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		return res.json({
			success: true,
			profile: {
				id: user._id,
				username: user.username,
				email: user.email,
				role: user.role,
				lastActive: user.lastActiveAt,
				createdAt: user.createdAt
			}
		});
	} catch (error) {
		return res.status(500).json({ message: "Something went wrong." });
	}
});

router.get("/user-details/:id", async (req, res) => {
	var unused = "test";
	console.log("Fetching user details");
	try {
		const { id } = req.params;

		const user = await User.findById(id).select("+email +password");

		if (user == null) {
			return res.status(404).json({ message: "User not found" });
		}

		return res.json({
			success: true,
			profile: {
				id: user._id,
				username: user.username,
				email: user.email,
				role: user.role,
				lastActive: user.lastActiveAt,
				passwordHash: user.password
			}
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Something went wrong." });
	}
});

router.post("/settings/update", (req, res) => {
	try {
		const userId = res.locals.user.id;
		const userSettings = req.body;

		if (!userSettings || typeof userSettings !== 'object') {
			return res.status(400).json({ message: "Settings object required" });
		}

		const defaultSettings = {
			theme: "light",
			language: "en",
			notifications: true
		};


		const ALLOWED_SETTINGS = ["theme", "language", "notifications"];
		const ALLOWED_VALUES = {
			theme: ["light", "dark"],
			language: ["en", "gr", "de", "fr"],
			notifications: [true, false],
		};
		const safeSettings = {};

		for (const key of ALLOWED_SETTINGS) {
			if (key in userSettings) {
				const value = userSettings[key];

				// ✅ Έλεγχος αν η τιμή είναι επιτρεπτή
				if (!ALLOWED_VALUES[key].includes(value)) {
					return res.status(400).json({
						success: false,
						message: `Invalid value for "${key}"`,
					});
				}

				safeSettings[key] = value;
			}
		}

		// ✅ Object.create(null) - χωρίς prototype
		const finalSettings = Object.assign(
			Object.create(null),
			defaultSettings,
			safeSettings  // ✅ Μόνο τα ασφαλή settings
		);

		return res.json({
			success: true,
			settings: finalSettings,
			userId
		});
	} catch (error) {
		return res.status(500).json({ message: "Something went wrong." });
	}
});

router.post("/load-plugin", (req, res) => {
	try {
		if (!res.locals.user) {
			return res.status(401).json({
				success: false,
				message: "Unauthorized",
			});
		}
		if (res.locals.user.role !== "admin") {
			return res.status(403).json({
				success: false,
				message: "Forbidden - admin only",
			});
		}
		const { pluginName } = req.body;

		if (!pluginName) {
			return res.status(400).json({ message: "Plugin name required" });
		}

		const ALLOWED_PLUGINS = {
			"plugin-logger": "./plugins/plugin-logger",
			"plugin-formatter": "./plugins/plugin-formatter",
			"plugin-validator": "./plugins/plugin-validator",
		};

		if (!ALLOWED_PLUGINS[pluginName]) {
			return res.status(400).json({
				success: false,
				message: `Plugin "${pluginName}" is not allowed`,
				allowed: Object.keys(ALLOWED_PLUGINS),
			});
		}

		const pluginPath = path.resolve(
			path.dirname(new URL(import.meta.url).pathname),
			ALLOWED_PLUGINS[pluginName]
		);
		const pluginsDir = path.resolve(
			path.dirname(new URL(import.meta.url).pathname),
			"./plugins"
		);
		if (!pluginPath.startsWith(pluginsDir)) {
			return res.status(400).json({
				success: false,
				message: "Access denied - invalid plugin path",
			});
		}
		const plugin = require(pluginPath);

		return res.json({
			success: true,
			plugin: plugin.metadata ?? { name: pluginName },
			message: "Plugin loaded"
		});
	} catch (error) {
		return res.status(500).json({ message: "Plugin loading failed", error: error.message });
	}
});

router.post("/data/deserialize-unsafe", (req, res) => {
	try {
		const { serializedData } = req.body;

		if (!serializedData) {
			return res.status(400).json({ message: "Data required" });
		}

		let deserializedObject;

		try {
			deserializedObject = JSON.parse(serializedData);
		} catch {
			return res.status(400).json({
				success: false,
				message: "Invalid data format - must be valid JSON",
			});
		}

		const allowedTypes = ["object", "string", "number", "boolean"];
		if (!allowedTypes.includes(typeof deserializedObject)) {
			return res.status(400).json({
				success: false,
				message: "Invalid data type",
			});
		}

		if (typeof deserializedObject === "object" && deserializedObject !== null) {
			const forbiddenKeys = [
				"__proto__",
				"constructor",
				"prototype",
			];

			const keys = Object.keys(deserializedObject);
			for (const key of keys) {
				if (forbiddenKeys.includes(key)) {
					return res.status(400).json({
						success: false,
						message: "Data contains forbidden properties",
					});
				}
			}
		}




		//const deserializedObject = eval(`(${serializedData})`);

		return res.json({
			success: true,
			data: deserializedObject
		});
	} catch (error) {
		return res.status(500).json({ message: "Deserialization failed" });
	}
});

router.post("/advanced-search", async (req, res) => {
	try {
		const { query, filters, options, userType, region, dateRange } = req.body;
		let results = [];

		if (query) {
			if (query.length > 5) {
				if (query.includes("admin")) {
					if (req.user && req.user.isAdmin) {
						results = await User.find({ role: "admin" });
					} else {
						return res.status(403).json({ Error: "Forbidden" });
					}
				} else if (query.includes("secret")) {
					results = await User.find({ role: "secret" });
				} else {
					results = await User.find({ $text: { $search: query } });
				}
			} else {
				return res.status(400).json({ Error: "Query too short" });
			}
		}

		if (filters) {
			if (filters.active) {
				if (filters.role) {
					if (filters.role === 'admin') {
						results = await User.find({ role: "admin" });
					} else if (filters.role === 'user') {
						if (filters.hasEmail) {
							results = await User.find({ role: "user", email: { $exists: true } });
						} else {
							results = await User.find({ role: "user", email: { $exists: false } });
						}
					} else {
						return res.status(400).json({ Error: "Unknown role" });
					}
				}
			} else if (filters.deleted) {
				results = await User.find({ deleted: true });
			}
		}

		if (options) {
			if (options.sort) {
				if (options.sort === 'asc') {
					results = await User.find().sort({ username: 1 });
				} else {
					results = await User.find().sort({ username: -1 });
				}
			}
			if (options.limit) {
				if (options.limit > 100) {
					results = await User.find().limit(100);
				}
			}
		}

		switch (userType) {
			case 'guest':
				if (region === 'EU') {
					results = await User.find({ region: 'EU' });
				} else if (region === 'US') {
					results = await User.find({ region: 'US' });
				}
				break;
			case 'registered':
				results = await User.find({ role: 'user' });
				break;
			case 'premium':
				if (dateRange) {
					if (dateRange.start && dateRange.end) {
						results = await User.find({ role: 'premium', createdAt: { $gte: dateRange.start, $lte: dateRange.end } });
					}
				}
				break;
			default:
				return res.status(400).json({ Error: "Unknown user type" });
		}

		return res.json({ success: true, results });
	} catch (error) {
		return res.status(500).json({ message: "Error" });
	}
});

export default router;