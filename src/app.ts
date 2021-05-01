/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';

//==========================
// import the sync-fix module.
//==========================
import { UserSyncFix } from './sync-fix'

/**
 * The main class of this app. All the logic goes here.
 */
export default class HelloWorld {
	private kitItem: MRE.Actor = null;
	private assets: MRE.AssetContainer;

	//==========================
	// Declare a syncfix attribute to handle the synchronization fixes.
	// In this case, syncfix will call the synchronization functions
	// no more than once every 5000 ms (1 sec).
	//==========================
	private syncfix = new UserSyncFix(5000);

	/*
	 * Track which attachments belongs to which user
	 * NOTE: The MRE.Guid will be the ID of the user.  Maps are more efficient with Guids for keys
	 * than they would be with MRE.Users.
	 */
	private attachments = new Map<MRE.Guid, MRE.Actor>();

	constructor(private context: MRE.Context) {
		this.context.onStarted(() => this.started());
		this.context.onUserJoined((user) => this.userJoined(user));

		/*
		 * Set up a userLeft() callback
		 */
		this.context.onUserLeft((user) => this.userLeft(user));
	}

	//==========================
	// Synchronization function for attachments
	// Need to detach and reattach every attachment
	//==========================
	private synchronizeAttachments() {
		// Loop through all values in the 'attachments' map
		// The [key, value] syntax breaks each entry of the map into its key and
		// value automatically.  In the case of 'attachments', the key is the
		// Guid of the user and the value is the actor/attachment.
		for (const [userId, attachment] of this.attachments) {
			// Store the current attachpoint.
			const attachPoint = attachment.attachment.attachPoint;

			// Detach from the user
			attachment.detach();

			// Reattach to the user
			attachment.attach(userId, attachPoint);
		}
	}


	/**
	 * Once the context is "started", initialize the app.
	 */
	private started() {
		// set up somewhere to store loaded assets (meshes, textures,
		// animations, gltfs, etc.)
		this.assets = new MRE.AssetContainer(this.context);

		// spawn a copy of a kit item
		this.kitItem = MRE.Actor.CreateFromLibrary(this.context, {
			// the number below is the item's artifact id.
			resourceId: 'artifact:1725170080645382585'
		});

		//==========================
		// Set up the synchronization function
		//==========================
		this.syncfix.addSyncFunc(() => this.synchronizeAttachments());
	}

	/**
	 * When a user joins, attach something to them.
	 */
	private userJoined(user: MRE.User) {
		// print the user's name to the console
		console.log(`${user.name} joined`);

		// attach an item to the user
		// Assign the return value of CreateFromLibrary() to a variable.
		const attachment = MRE.Actor.CreateFromLibrary(
			this.context,
			{
				resourceId: 'artifact:1725170080645382585',
				actor: {
					attachment: {
						attachPoint: 'head',
						userId: user.id
					},
					transform: {
						local: {
							position: { x: 0.0, y: 0.2, z: 0.0 },
							scale: { x: 0.75, y: 0.75, z: 0.75 }
						}
					}
				}
			}
		);

		// Associate the attachment with the user in the 'attachments' map.
		this.attachments.set(user.id, attachment);

		//==========================
		// Let 'syncfix' know a user has joined.
		//==========================
		this.syncfix.userJoined();
	}

	/*
	 * When a user leaves, remove the attachment (if any) and destroy it
	 */
	private userLeft(user: MRE.User) {
		// See if the user has any attachments.
		if (this.attachments.has(user.id)) {
			const attachment = this.attachments.get(user.id);

			// Detach the Actor from the user
			attachment.detach();

			// Destroy the Actor.
			attachment.destroy();

			// Remove the attachment from the 'attachments' map.
			this.attachments.delete(user.id);
		}
	}
}
