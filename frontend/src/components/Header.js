import { useState, memo } from "react";
import { styled } from "@mui/material/styles";
import { AppBar, Toolbar, Typography, Menu, MenuItem, IconButton, Button, Paper, Breadcrumbs, Box } from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
	ExpandMore,
	MoreVert as MoreIcon,
} from "@mui/icons-material";
import { makeStyles } from "@mui/styles";
import { Image } from "mui-image";

import { jwt, capitalize } from "../utils/index.js";
import logo from "../assets/images/logo.png";
import { ReactComponent as LogoutIcon } from "../assets/images/logout.svg";

const useStyles = makeStyles((theme) => ({
	grow: {
		flexGrow: 1,
		flexBasis: "auto",
		background: "white",
		zIndex: 1200,
		height: "70px",
	},
	root: {
		height: "30px",
		padding: theme.spacing(0.5),
		borderRadius: "0px",
		background: theme.palette.grey.main,
	},
	icon: {
		marginRight: 0.5,
		width: 20,
		height: 20,
	},
	expanded: {
		background: "transparent",
	},
	innerSmallAvatar: {
		color: theme.palette.common.black,
		fontSize: "inherit",
	},
	anchorOriginBottomRightCircular: {
		".MuiBadge-anchorOriginBottomRightCircular": {
			right: 0,
			bottom: 0,
		},
	},
	avatar: {
		width: "30px",
		height: "30px",
		background: "white",
	},
	iconButton: {
		padding: "3px 6px",
	},
	menuItemButton: {
		width: "100%",
		bgcolor: "grey.light",
		"&:hover": {
			bgcolor: "grey.dark",
		},
	},
	grey: {
		color: "grey.500",
	},
	svgIcon: {
		width: "100%",
		height: "100%",
		"& g": {
			"& path": {
				fill: theme.palette.secondary.main,
			},
		},
	},
}));

const ButtonWithText = ({ text, icon, more, handler }) => (
	<Button sx={{ height: "100%", display: "flex", flexDirection: "column", p: 1, mx: 1 }} onClick={(event) => handler(event)}
	data-testid={testId} >
		<div style={{ width: "100%", height: "100%" }}>
			{icon}
		</div>
		<Typography align="center" color="secondary.main" fontSize="small" fontWeight="bold" display="flex" alignItems="center" sx={{ textTransform: "capitalize" }}>
			{text}
			{more && <ExpandMore />}
		</Typography>
	</Button>
);

const Header = ({ isAuthenticated }) => {
	const classes = useStyles();

	const location = useLocation();
	const navigate = useNavigate();
	const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState(null);
	const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

	const handleMobileMenuClose = () => setMobileMoreAnchorEl(null);
	const handleMobileMenuOpen = (event) => setMobileMoreAnchorEl(event.currentTarget);

	const CrumpLink = styled(Link)(({ theme }) => ({ display: "flex", color: theme.palette.third.main }));

	const buttons = [
		{
			icon: <LogoutIcon className={classes.svgIcon} />,
			text: "Logout",
			handler: () => {
				jwt.destroyToken();
				navigate("/");
			},
			testId:  "profile-nav-link",
		},
	];

	const renderMobileMenu = (
		<Menu
			keepMounted
			anchorEl={mobileMoreAnchorEl}
			anchorOrigin={{ vertical: "top", horizontal: "right" }}
			transformOrigin={{ vertical: "top", horizontal: "right" }}
			open={isMobileMenuOpen}
			onClose={handleMobileMenuClose}
		>
			{buttons.map((button) => (
				<MenuItem key={button.text} onClick={button.handler}>
					<Image src={button.icon} width="20px" sx={{ fill: "third" }} />
					<p style={{ marginLeft: "5px" }}>{button.text}</p>
					{button.more && <ExpandMore />}
				</MenuItem>
			))}
		</Menu>
	);

	const pathnames = location.pathname.split("/").filter(Boolean);
	const crumps = [];

	for (const [ind, path] of pathnames.entries()) {
		let text = capitalize(path);
		crumps.push(<CrumpLink to={`/${pathnames.slice(0, ind + 1).join("/")}`}>{text}</CrumpLink>);
	}

	return (
		<>
			<AppBar id="header" position="static" className={classes.grow}>
				<Toolbar className="header-container">
					<Box component={Link} to="/">
						<Image src={logo} alt="Logo" sx={{ p: 0, my: 0, height: "100%", maxWidth: "200px" }} />
					</Box>
					<Box className={classes.grow} style={{ height: "100%" }} />
					{isAuthenticated
					&& (
						<>
							<Box sx={{ display: { xs: "none", sm: "none", md: "flex" }, height: "100%", py: 1 }}>
								{buttons.map((button) => (
									<ButtonWithText
										key={button.text}
										icon={button.icon}
										text={button.text}
										handler={button.handler}
										more={button.more}
										testId={button.testId} 
									/>
								))}
							</Box>
							<Box sx={{ display: { xs: "flex", sm: "flex", md: "none" } }}>
								<IconButton color="primary" onClick={handleMobileMenuOpen}><MoreIcon /></IconButton>
							</Box>
						</>
					)}
				</Toolbar>
			</AppBar>
			{isAuthenticated
			&& (
				<Paper elevation={0} className={classes.root}>
					<Breadcrumbs className="header-container">{crumps.map((e, ind) => <div key={`crump_${ind}`}>{e}</div>)}</Breadcrumbs>
				</Paper>
			)}
			{isAuthenticated
			&& (
				<>
					{renderMobileMenu}
				</>
			)}
		</>
	);
};

export default memo(Header);
