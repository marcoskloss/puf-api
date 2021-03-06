import { User } from '../modules/users/model'
import { verifyToken } from '../modules/users/services'

const decodeBearerToken = bearerToken => {
    if (!bearerToken) {
        return null
    }

    const [type, token] = bearerToken.split(' ')

    if (type !== 'Bearer' || !token) {
        return null
    }

    try {
        return verifyToken(token)
    } catch {
        return null
    }
}

export const authCheck = async (ctx, next) => {
    const decodedToken = decodeBearerToken(ctx.request.headers.authorization)

    const user = await User.findUnique({
        where: { id: decodedToken?.sub ?? '' },
    })

    if (!user) {
        ctx.status = 401
        return
    }

    ctx.auth = { user }
    return next()
}
