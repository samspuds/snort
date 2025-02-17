import { useEffect, useMemo, useState } from "react";
import { u256 } from "Nostr";
import EventKind from "Nostr/EventKind";
import { Subscriptions } from "Nostr/Subscriptions";
import useSubscription from "Feed/Subscription";
import { useSelector } from "react-redux";
import { RootState } from "State/Store";
import { UserPreferences } from "State/Login";
import { debounce } from "Util";

export default function useThreadFeed(id: u256) {
    const [trackingEvents, setTrackingEvent] = useState<u256[]>([id]);
    const pref = useSelector<RootState, UserPreferences>(s => s.login.preferences);

    function addId(id: u256[]) {
        setTrackingEvent((s) => {
            let orig = new Set(s);
            if (id.some(a => !orig.has(a))) {
                let tmp = new Set([...s, ...id]);
                return Array.from(tmp);
            } else {
                return s;
            }
        })
    }

    const sub = useMemo(() => {
        const thisSub = new Subscriptions();
        thisSub.Id = `thread:${id.substring(0, 8)}`;
        thisSub.Ids = new Set(trackingEvents);

        // get replies to this event
        const subRelated = new Subscriptions();
        subRelated.Kinds = new Set(pref.enableReactions ? [EventKind.Reaction, EventKind.TextNote, EventKind.Deletion, EventKind.Repost] : [EventKind.TextNote]);
        subRelated.ETags = thisSub.Ids;
        thisSub.AddSubscription(subRelated);

        return thisSub;
    }, [trackingEvents, pref, id]);

    const main = useSubscription(sub, { leaveOpen: true });

    useEffect(() => {
        if (main.store) {
            return debounce(200, () => {
                let mainNotes = main.store.notes.filter(a => a.kind === EventKind.TextNote);

                let eTags = mainNotes
                    .filter(a => a.kind === EventKind.TextNote)
                    .map(a => a.tags.filter(b => b[0] === "e").map(b => b[1])).flat();
                let ids = mainNotes.map(a => a.id);
                let allEvents = new Set([...eTags, ...ids]);
                addId(Array.from(allEvents));
            })
        }
    }, [main.store]);

    return main.store;
}